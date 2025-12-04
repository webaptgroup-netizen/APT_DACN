import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { assignOwner, createResident, listResidents, removeResident } from './residents.service';

const router = Router();

const querySchema = z.object({
  query: z.object({
    buildingId: z.string().optional()
  })
});

router.get(
  '/',
  requireAuth,
  validateRequest(querySchema),
  asyncHandler(async (req, res) => {
    const filters: { buildingId?: number } = {};
    if (req.query.buildingId) {
      filters.buildingId = Number(req.query.buildingId as string);
    }
    if (req.user?.role === 'Ban quan ly') {
      const residents = await listResidents(filters);
      return res.json(residents);
    }

    const residents = await listResidents();
    const filtered = residents.filter((item) => item.ID_NguoiDung === req.user?.id);

    if (filtered.length || req.user?.role !== 'Cu dan') {
      return res.json(filtered);
    }

    // Fallback: với tài khoản "Cư dân" chưa được gán vào bảng CuDans,
    // vẫn trả về một record ảo để phía frontend hiển thị thẻ thông tin cơ bản.
    const { findUserById } = await import('../auth/auth.service');
    const user = await findUserById(req.user!.id);

    if (!user) {
      return res.json(filtered);
    }

    return res.json([
      {
        ID: 0,
        ID_NguoiDung: user.ID,
        ID_CanHo: 0,
        ID_ChungCu: 0,
        LaChuHo: false,
        NguoiDungs: {
          HoTen: user.HoTen,
          Email: user.Email,
          SoDienThoai: user.SoDienThoai,
          LoaiNguoiDung: user.LoaiNguoiDung
        },
        CanHos: {
          MaCan: '---'
        }
      }
    ]);
  })
);

const createSchema = z.object({
  body: z.object({
    ID_NguoiDung: z.number(),
    ID_CanHo: z.number(),
    ID_ChungCu: z.number(),
    LaChuHo: z.boolean().optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(createSchema),
  asyncHandler(async (req, res) => {
    const resident = await createResident(req.body);
    res.status(201).json(resident);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    await removeResident(Number(req.params.id));
    res.status(204).send();
  })
);

const ownerSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    isOwner: z.boolean()
  })
});

router.post(
  '/:id/owner',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(ownerSchema),
  asyncHandler(async (req, res) => {
    const result = await assignOwner(Number(req.params.id), req.body.isOwner);
    res.json(result);
  })
);

export default router;
