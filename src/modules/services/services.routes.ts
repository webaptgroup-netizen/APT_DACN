import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';
import {
  createService,
  deleteService,
  listServices,
  registerServiceForResident,
  updateService
} from './services.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const services = await listServices();
    res.json(services);
  })
);

const payloadSchema = z.object({
  body: z.object({
    TenDichVu: z.string(),
    MoTa: z.string().optional(),
    Gia: z.number().positive(),
    HinhAnh: z.string().optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(payloadSchema),
  asyncHandler(async (req, res) => {
    const service = await createService(req.body);
    res.status(201).json(service);
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
    const updated = await updateService(Number(req.params.id), req.body);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    await deleteService(Number(req.params.id));
    res.status(204).send();
  })
);

router.post(
  '/:id/register',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await registerServiceForResident(req.user!.id, Number(req.params.id));
    res.json(result);
  })
);

export default router;
