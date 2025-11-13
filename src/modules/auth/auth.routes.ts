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
  updateProfile
} from './auth.service';
import { signToken } from '../../utils/jwt';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { AppError } from '../../utils/appError';

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
    const token = signToken({
      id: user.ID,
      email: user.Email,
      role: user.LoaiNguoiDung
    });

    res.status(201).json({
      token,
      user: {
        id: user.ID,
        hoTen: user.HoTen,
        email: user.Email,
        role: user.LoaiNguoiDung,
        soDienThoai: user.SoDienThoai
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
    const token = signToken({
      id: user.ID,
      email: user.Email,
      role: user.LoaiNguoiDung
    });

    res.json({
      token,
      user: {
        id: user.ID,
        hoTen: user.HoTen,
        email: user.Email,
        role: user.LoaiNguoiDung,
        soDienThoai: user.SoDienThoai
      }
    });
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
    soDienThoai: z.string().optional()
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
    const updated = await elevateRole(req.body.userId, req.body.role);
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

export default router;
