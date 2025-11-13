import { Router } from 'express';
import { z } from 'zod';
import { listBuildings, createBuilding, updateBuilding, deleteBuilding } from './buildings.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const buildings = await listBuildings();
    res.json(buildings);
  })
);

const payloadSchema = z.object({
  body: z.object({
    Ten: z.string(),
    DiaChi: z.string(),
    ChuDauTu: z.string().optional(),
    NamXayDung: z.number().optional(),
    SoTang: z.number().optional(),
    MoTa: z.string().optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(payloadSchema),
  asyncHandler(async (req, res) => {
    const building = await createBuilding(req.body);
    res.status(201).json(building);
  })
);

const updateSchema = z.object({
  params: z.object({ id: z.string() }),
  body: payloadSchema.shape.body.partial()
});

router.put(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(updateSchema),
  asyncHandler(async (req, res) => {
    const updated = await updateBuilding(Number(req.params.id), req.body);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    await deleteBuilding(Number(req.params.id));
    res.status(204).send();
  })
);

export default router;
