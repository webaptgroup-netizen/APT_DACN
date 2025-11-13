import { supabase } from '../../config/supabase';
import { AppError } from '../../utils/appError';
import { hashPassword, verifyPassword } from '../../utils/password';
import type { UserRole } from '../../types/auth';

const USER_TABLE = 'NguoiDungs';
const RESIDENT_TABLE = 'CuDans';

export interface CreateUserInput {
  hoTen: string;
  email: string;
  password: string;
  soDienThoai?: string;
}

export interface UpdateProfileInput {
  hoTen?: string;
  soDienThoai?: string;
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
  const { data, error } = await supabase
    .from(USER_TABLE)
    .update({
      HoTen: input.hoTen,
      SoDienThoai: input.soDienThoai
    })
    .eq('ID', id)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update profile', 500, error);
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

export const getProfileWithResidency = async (userId: number) => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select(
      `
        ID,
        HoTen,
        Email,
        SoDienThoai,
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
  const { data, error } = await supabase.from(RESIDENT_TABLE).select('*').eq('ID_NguoiDung', userId).maybeSingle();

  if (error) {
    throw new AppError('Failed to load resident info', 500, error);
  }

  return data;
};

export const listUsers = async () => {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('ID, HoTen, Email, SoDienThoai, LoaiNguoiDung')
    .order('HoTen', { ascending: true });

  if (error) {
    throw new AppError('Failed to list users', 500, error);
  }

  return data;
};
