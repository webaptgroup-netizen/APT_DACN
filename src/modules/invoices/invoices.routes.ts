import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { getInvoiceReceipt, listInvoices, listInvoicesForResident, updateInvoiceStatus } from './invoices.service';

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
    status: z.enum(['Chua thanh toan', 'Da thanh toan']),
    ngayThucHien: z.string().datetime().optional()
  })
});

router.patch(
  '/:id/status',
  requireAuth,
  requireRoles('Ban quan ly'),
  validateRequest(statusSchema),
  asyncHandler(async (req, res) => {
    const invoice = await updateInvoiceStatus(
      req.user!.id,
      Number(req.params.id),
      req.body.status,
      req.body.ngayThucHien
    );
    res.json(invoice);
  })
);

router.get(
  '/:id/receipt',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoiceId = Number(req.params.id);
    const receipt = await getInvoiceReceipt(invoiceId);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found for this invoice' });
    }

    res.json(receipt);
  })
);

export default router;
