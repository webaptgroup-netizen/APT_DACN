import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';
import { hashPassword, verifyPassword } from '../../utils/password';
import type { UserRole } from '../../types/auth';
import { createHmac, randomInt, randomUUID } from 'crypto';
import { notifyPasswordChangedWebhook, notifyPasswordResetOtpWebhook } from '../../integrations/n8n/passwordReset';

const USER_TABLE = 'NguoiDungs';
const RESIDENT_TABLE = 'CuDans';
const PASSWORD_RESET_TABLE = 'PasswordResetRequests';
const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_LOCK_MS = 10 * 60 * 1000;

export interface CreateUserInput {
  hoTen: string;
  email: string;
  password: string;
  soDienThoai?: string;
}

export interface UpdateProfileInput {
  hoTen?: string;
  soDienThoai?: string;
  hinhAnh?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const findUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('*')
    .ilike('Email', email)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to query user', 500, error);
  }

  return data;
};

export const findUserById = async (id: number) => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('*')
    .eq('ID', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load user', 500, error);
  }

  return data;
};

export const createUser = async (input: CreateUserInput) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);
  const { data, error } = await supabase
    .from(USER_TABLE)
    .insert({
      HoTen: input.hoTen,
      Email: input.email,
      MatKhau: passwordHash,
      SoDienThoai: input.soDienThoai,
      LoaiNguoiDung: 'Khach'
    })
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create user', 500, error);
  }

  return data;
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await verifyPassword(password, user.MatKhau);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  return user;
};

export const updateProfile = async (id: number, input: UpdateProfileInput) => {
  const existing = await findUserById(id);

  const { data, error } = await supabase
    .from(USER_TABLE)
    .update({
      HoTen: input.hoTen,
      SoDienThoai: input.soDienThoai,
      HinhAnh: input.hinhAnh
    })
    .eq('ID', id)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update profile', 500, error);
  }

  // If avatar changed, try to delete old file in Supabase Storage (best-effort)
  try {
    if (input.hinhAnh && existing?.HinhAnh && input.hinhAnh !== existing.HinhAnh) {
      const bucket = env.SUPABASE_STORAGE_BUCKET;
      const prefix = `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/`;

      if (existing.HinhAnh.startsWith(prefix)) {
        const path = existing.HinhAnh.substring(prefix.length);
        if (path) {
          await supabase.storage.from(bucket).remove([path]);
        }
      }
    }
  } catch (cleanupError) {
    console.warn('Failed to cleanup old avatar in storage', cleanupError);
  }

  return data;
};

export const changePassword = async (id: number, input: ChangePasswordInput) => {
  const user = await findUserById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValid = await verifyPassword(input.currentPassword, user.MatKhau);
  if (!isValid) {
    throw new AppError('Invalid current password', 400);
  }

  const newHash = await hashPassword(input.newPassword);
  const { error } = await supabase
    .from(USER_TABLE)
    .update({ MatKhau: newHash })
    .eq('ID', id);

  if (error) {
    throw new AppError('Failed to update password', 500, error);
  }
};

const hashResetValue = (value: string) => createHmac('sha256', env.JWT_SECRET).update(value).digest('hex');

const generateSixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const requestPasswordReset = async (email: string) => {
  const normalizedEmail = email.trim();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return;
  }

  const code = generateSixDigitCode();
  const now = Date.now();
  const expiresAt = new Date(now + PASSWORD_RESET_CODE_TTL_MS).toISOString();

  const { data: existingRequest, error: loadError } = await supabase
    .from(PASSWORD_RESET_TABLE)
    .select('LockedUntil')
    .eq('Email', user.Email)
    .maybeSingle();

  if (loadError) {
    throw new AppError('Failed to load password reset request', 500, loadError);
  }

  const lockedUntilValue = (existingRequest as any)?.LockedUntil as string | null | undefined;
  const lockedUntil = typeof lockedUntilValue === 'string' ? new Date(lockedUntilValue).getTime() : NaN;
  const isLocked = Number.isFinite(lockedUntil) && lockedUntil > Date.now();

  if (isLocked) {
    return;
  }

  const { error: upsertError } = await supabase.from(PASSWORD_RESET_TABLE).upsert(
    {
      ID_NguoiDung: user.ID,
      Email: user.Email,
      CodeHash: hashResetValue(code),
      ExpiresAt: expiresAt,
      FailedAttempts: 0,
      LockedUntil: null,
      VerifiedAt: null,
      ResetTokenHash: null,
      ResetTokenExpiresAt: null,
      ConsumedAt: null
    },
    { onConflict: 'Email' }
  );

  if (upsertError) {
    throw new AppError('Failed to store password reset code', 500, upsertError);
  }

  const timestamp = new Date().toISOString();
  const otpPayload = {
    email: user.Email,
    userName: user.HoTen,
    code,
    timestamp
  } as const;

  await notifyPasswordResetOtpWebhook(env.APP_URL ? { ...otpPayload, appUrl: env.APP_URL } : otpPayload);
};

export const verifyPasswordResetCode = async (email: string, code: string) => {
  const normalizedEmail = email.trim();
  const { data: resetRequest, error } = await supabase
    .from(PASSWORD_RESET_TABLE)
    .select('*')
    .eq('Email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load reset request', 500, error);
  }

  const lockedUntilValue = (resetRequest as any)?.LockedUntil as string | null | undefined;
  const lockedUntil = typeof lockedUntilValue === 'string' ? new Date(lockedUntilValue).getTime() : NaN;
  const isLocked = Number.isFinite(lockedUntil) && lockedUntil > Date.now();
  if (!resetRequest || isLocked) {
    throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn', 400);
  }

  const expiresAtValue = (resetRequest as any)?.ExpiresAt as string | null | undefined;
  const codeHashValue = (resetRequest as any)?.CodeHash as string | null | undefined;
  const expiresAt = typeof expiresAtValue === 'string' ? new Date(expiresAtValue).getTime() : NaN;
  const isExpired = !Number.isFinite(expiresAt) || expiresAt <= Date.now();

  if (typeof codeHashValue !== 'string' || !codeHashValue || isExpired) {
    throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn', 400);
  }

  if (hashResetValue(code) !== codeHashValue) {
    const currentAttempts = typeof (resetRequest as any).FailedAttempts === 'number' ? (resetRequest as any).FailedAttempts : 0;
    const nextAttempts = currentAttempts + 1;

    const lockUntil =
      nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS ? new Date(Date.now() + PASSWORD_RESET_LOCK_MS).toISOString() : null;

    await supabase
      .from(PASSWORD_RESET_TABLE)
      .update({
        FailedAttempts: nextAttempts,
        LockedUntil: lockUntil
      })
      .eq('Email', normalizedEmail);

    throw new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn', 400);
  }

  const resetToken = (() => {
    try {
      return randomUUID();
    } catch {
      return `${Date.now()}-${randomInt(0, 1_000_000_000)}`;
    }
  })();
  const tokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();
  const expireUsedCodeAt = new Date(Date.now() - 1000).toISOString();

  const { error: updateError } = await supabase
    .from(PASSWORD_RESET_TABLE)
    .update({
      ExpiresAt: expireUsedCodeAt,
      FailedAttempts: 0,
      LockedUntil: null,
      VerifiedAt: new Date().toISOString(),
      ResetTokenHash: hashResetValue(resetToken),
      ResetTokenExpiresAt: tokenExpiresAt,
      ConsumedAt: null
    })
    .eq('Email', normalizedEmail);

  if (updateError) {
    throw new AppError('Failed to verify reset code', 500, updateError);
  }

  return { resetToken };
};

export const resetPasswordWithToken = async (resetToken: string, newPassword: string) => {
  const tokenHash = hashResetValue(resetToken);

  const { data: resetRequest, error } = await supabase
    .from(PASSWORD_RESET_TABLE)
    .select('*')
    .eq('ResetTokenHash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load reset request', 500, error);
  }

  const expiresAtValue = (resetRequest as any)?.ResetTokenExpiresAt as string | null | undefined;
  const expiresAt = typeof expiresAtValue === 'string' ? new Date(expiresAtValue).getTime() : NaN;
  const isExpired = !Number.isFinite(expiresAt) || expiresAt <= Date.now();

  const consumedAtValue = (resetRequest as any)?.ConsumedAt as string | null | undefined;
  const isConsumed = typeof consumedAtValue === 'string' && consumedAtValue.length > 0;

  if (!resetRequest || isExpired || isConsumed) {
    throw new AppError('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);
  }

  const userIdValue = (resetRequest as any)?.ID_NguoiDung as number | null | undefined;
  if (typeof userIdValue !== 'number') {
    throw new AppError('Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);
  }

  const newHash = await hashPassword(newPassword);

  const user = await findUserById(userIdValue);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { error: updateError } = await supabase.from(USER_TABLE).update({ MatKhau: newHash }).eq('ID', userIdValue);

  if (updateError) {
    throw new AppError('Failed to update password', 500, updateError);
  }

  const consumedAt = new Date().toISOString();
  await supabase
    .from(PASSWORD_RESET_TABLE)
    .update({
      ResetTokenHash: null,
      ResetTokenExpiresAt: null,
      ConsumedAt: consumedAt
    })
    .eq('Email', user.Email);

  const timestamp = new Date().toISOString();
  const changedPayload = {
    email: user.Email,
    userName: user.HoTen,
    timestamp
  } as const;

  await notifyPasswordChangedWebhook(env.APP_URL ? { ...changedPayload, appUrl: env.APP_URL } : changedPayload);
};

export const getProfileWithResidency = async (userId: number) => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select(
      `
        ID,
        HoTen,
        Email,
        SoDienThoai,
        HinhAnh,
        LoaiNguoiDung,
        CuDans (
          ID,
          ID_CanHo,
          ID_ChungCu,
          LaChuHo
        )
      `
    )
    .eq('ID', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load profile', 500, error);
  }

  return data;
};

export const elevateRole = async (userId: number, role: UserRole) => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .update({ LoaiNguoiDung: role })
    .eq('ID', userId)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update role', 500, error);
  }

  return data;
};

export const getResidentInfo = async (userId: number) => {
  const { data, error } = await supabase
    .from(RESIDENT_TABLE)
    .select('*')
    .eq('ID_NguoiDung', userId)
    .order('LaChuHo', { ascending: false })
    .order('ID', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load resident info', 500, error);
  }

  return data;
};

export const listUsers = async () => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('ID, HoTen, Email, SoDienThoai, LoaiNguoiDung, HinhAnh')
    .order('HoTen', { ascending: true });

  if (error) {
    throw new AppError('Failed to list users', 500, error);
  }

  return data;
};

export const deleteUser = async (id: number) => {
  const { error } = await supabase.from(USER_TABLE).delete().eq('ID', id);

  if (error) {
    throw new AppError('Failed to delete user', 500, error);
  }
};
