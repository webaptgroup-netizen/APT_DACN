import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { createComplaint, listComplaints, updateComplaint } from './complaints.service';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const complaints = await listComplaints(req.user!);
    res.json(complaints);
  })
);

const createSchema = z.object({
  body: z.object({
    NoiDung: z.string().min(10),
    HinhAnh: z.string().optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Cu dan'),
  validateRequest(createSchema),
  asyncHandler(async (req, res) => {
    const item = await createComplaint(req.user!.id, req.body);
    res.status(201).json(item);
  })
);

const updateSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    TrangThai: z.enum(['Chua xu ly', 'Dang xu ly', 'Da xu ly']).optional(),
    PhanHoi: z.string().optional()
  })
});

router.patch(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(updateSchema),
  asyncHandler(async (req, res) => {
    const item = await updateComplaint(Number(req.params.id), req.body);
    res.json(item);
  })
);

export default router;
