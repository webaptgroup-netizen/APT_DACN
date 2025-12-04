import { Router } from 'express';
import { z } from 'zod';
import { createApartment, deleteApartment, listApartments, updateApartment, ApartmentStatus, getApartment } from './apartments.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';

const router = Router();

const querySchema = z.object({
  query: z.object({
    buildingId: z.string().optional(),
    status: z.enum(['Dang ban', 'Da ban', 'Cho thue', 'Da thue']).optional()
  })
});

router.get(
  '/',
  validateRequest(querySchema),
  asyncHandler(async (req, res) => {
    const { buildingId, status } = req.query as Record<string, string | undefined>;
    const filters: { buildingId?: number; status?: ApartmentStatus } = {};

    if (buildingId) {
      filters.buildingId = Number(buildingId);
    }

    if (status) {
      filters.status = status as ApartmentStatus;
    }

    const apartments = await listApartments(filters);
    res.json(apartments);
  })
);

const getByIdSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

router.get(
  '/:id',
  validateRequest(getByIdSchema),
  asyncHandler(async (req, res) => {
    const apartment = await getApartment(Number(req.params.id));
    if (!apartment) {
      return res.status(404).json({ message: 'Apartment not found' });
    }
    res.json(apartment);
  })
);

const payloadSchema = z.object({
  body: z.object({
    MaCan: z.string(),
    ID_ChungCu: z.number(),
    DienTich: z.number().optional(),
    SoPhong: z.number().optional(),
    Gia: z.number().optional(),
    TrangThai: z.enum(['Dang ban', 'Da ban', 'Cho thue', 'Da thue']),
    MoTa: z.string().optional(),
    Model3DUrl: z.string().url().optional(),
    URLs: z.array(z.string().url()).optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(payloadSchema),
  asyncHandler(async (req, res) => {
    const apartment = await createApartment(req.body);
    res.status(201).json(apartment);
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
    const updated = await updateApartment(Number(req.params.id), req.body);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    await deleteApartment(Number(req.params.id));
    res.status(204).send();
  })
);

export default router;
