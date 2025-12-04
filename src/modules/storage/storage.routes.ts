import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { deleteFile, listThreeDAssets, uploadBase64Image } from './storage.service';

const router = Router();

const uploadSchema = z.object({
  body: z.object({
    base64: z.string().min(10),
    folder: z.string().min(1).max(80).optional(),
    fileName: z.string().optional()
  })
});

router.post(
  '/upload',
  requireAuth,
  validateRequest(uploadSchema),
  asyncHandler(async (req, res) => {
    const result = await uploadBase64Image(req.body);
    res.status(201).json(result);
  })
);

const deleteSchema = z.object({
  body: z.object({
    path: z.string().min(5)
  })
});

router.delete(
  '/file',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(deleteSchema),
  asyncHandler(async (req, res) => {
    await deleteFile(req.body.path);
    res.json({ message: 'Deleted' });
  })
);

router.get(
  '/3d-assets',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const assets = await listThreeDAssets();
    res.json(assets);
  })
);

export default router;
