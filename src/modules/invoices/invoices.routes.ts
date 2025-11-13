import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { listInvoices, listInvoicesForResident, updateInvoiceStatus } from './invoices.service';

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
    if (req.user?.role === 'Ban quan ly') {
      const filters: { buildingId?: number } = {};
      if (req.query.buildingId) {
        filters.buildingId = Number(req.query.buildingId as string);
      }

      const invoices = await listInvoices(filters);
      return res.json(invoices);
    }

    const invoices = await listInvoicesForResident(req.user!.id);
    res.json(invoices);
  })
);

const statusSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['Chua thanh toan', 'Da thanh toan'])
  })
});

router.patch(
  '/:id/status',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(statusSchema),
  asyncHandler(async (req, res) => {
    const invoice = await updateInvoiceStatus(Number(req.params.id), req.body.status);
    res.json(invoice);
  })
);

export default router;
