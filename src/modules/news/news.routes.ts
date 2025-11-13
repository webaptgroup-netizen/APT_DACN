import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { listNews, createNews, updateNews, deleteNews } from './news.service';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const news = await listNews();
    res.json(news);
  })
);

const payloadSchema = z.object({
  body: z.object({
    TieuDe: z.string(),
    NoiDung: z.string(),
    HinhAnh: z.string().optional()
  })
});

router.post(
  '/',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(payloadSchema),
  asyncHandler(async (req, res) => {
    const news = await createNews(req.body);
    res.status(201).json(news);
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
    const updated = await updateNews(Number(req.params.id), req.body);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('Ban quan ly'),
  asyncHandler(async (req, res) => {
    await deleteNews(Number(req.params.id));
    res.status(204).send();
  })
);

export default router;
