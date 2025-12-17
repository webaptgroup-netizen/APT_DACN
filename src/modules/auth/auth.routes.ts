import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import {
  authenticateUser,
  changePassword,
  createUser,
  getProfileWithResidency,
  listUsers,
  requestPasswordReset,
  resetPasswordWithToken,
  updateProfile,
  verifyPasswordResetCode
} from './auth.service';
import { signToken } from '../../utils/jwt';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { AppError } from '../../utils/appError';
import { buildResidentUpgradePayload, notifyResidentUpgradeWebhook } from '../../integrations/n8n/residentUpgrade';
import { normalizeUserRole } from '../../utils/roles';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    hoTen: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    soDienThoai: z.string().optional()
  })
});

router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body);
    const role = normalizeUserRole(user.LoaiNguoiDung);
    const token = signToken({
      id: user.ID,
      email: user.Email,
      role
    });

    res.status(201).json({
      token,
      user: {
        id: user.ID,
        hoTen: user.HoTen,
        email: user.Email,
        role,
        soDienThoai: user.SoDienThoai,
        hinhAnh: user.HinhAnh
      }
    });
  })
);

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await authenticateUser(req.body.email, req.body.password);
    const role = normalizeUserRole(user.LoaiNguoiDung);
    const token = signToken({
      id: user.ID,
      email: user.Email,
      role
    });

    res.json({
      token,
      user: {
        id: user.ID,
        hoTen: user.HoTen,
        email: user.Email,
        role,
        soDienThoai: user.SoDienThoai,
        hinhAnh: user.HinhAnh
      }
    });
  })
);

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email()
  })
});

router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email);
    res.json({ message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi.' });
  })
);

const verifyResetCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    code: z.string().regex(/^\d{6}$/)
  })
});

router.post(
  '/forgot-password/verify',
  validateRequest(verifyResetCodeSchema),
  asyncHandler(async (req, res) => {
    const result = await verifyPasswordResetCode(req.body.email, req.body.code);
    res.json(result);
  })
);

const resetPasswordSchema = z.object({
  body: z
    .object({
      resetToken: z.string().min(10),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(8)
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Mật khẩu nhập lại không khớp',
      path: ['confirmPassword']
    })
});

router.post(
  '/forgot-password/reset',
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPasswordWithToken(req.body.resetToken, req.body.newPassword);
    res.json({ message: 'Đổi mật khẩu thành công' });
  })
);

router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getProfileWithResidency(req.user!.id);
    if (!profile) {
      throw new AppError('User not found', 404);
    }

    res.json(profile);
  })
);

const updateSchema = z.object({
  body: z.object({
    hoTen: z.string().min(3).optional(),
    soDienThoai: z.string().optional(),
    hinhAnh: z.string().url().optional()
  })
});

router.put(
  '/profile',
  requireAuth,
  validateRequest(updateSchema),
  asyncHandler(async (req, res) => {
      const updated = await updateProfile(req.user!.id, req.body);
      res.json(updated);
    })
);

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8)
  })
});

router.post(
  '/change-password',
  requireAuth,
  validateRequest(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await changePassword(req.user!.id, req.body);
    res.json({ message: 'Password updated' });
  })
);

const updateRoleSchema = z.object({
  body: z.object({
    userId: z.number(),
    role: z.enum(['Khach', 'Cu dan', 'Ban quan ly'])
  })
});

router.post(
  '/role',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const { elevateRole } = await import('./auth.service');
    const { findUserById, getResidentInfo } = await import('./auth.service');

    const existingUser = await findUserById(req.body.userId);
    const previousRole = existingUser?.LoaiNguoiDung;

    const updated = await elevateRole(req.body.userId, req.body.role);

    if (previousRole !== 'Cu dan' && req.body.role === 'Cu dan' && existingUser) {
      try {
        const resident = await getResidentInfo(existingUser.ID);
        const webhookPayload = await buildResidentUpgradePayload({
          email: existingUser.Email,
          residentName: existingUser.HoTen,
          buildingId: resident?.ID_ChungCu,
          apartmentId: resident?.ID_CanHo
        });

        await notifyResidentUpgradeWebhook(webhookPayload);
      } catch (err) {
        console.warn('Failed to notify resident upgrade webhook (admin role change)', err);
      }
    }
    res.json(updated);
  })
);

router.get(
  '/users',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json(users);
  })
);

router.delete(
  '/users/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    const { deleteUser } = await import('./auth.service');
    await deleteUser(Number(req.params.id));
    res.status(204).send();
  })
);

export default router;
