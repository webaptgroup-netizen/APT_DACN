import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import buildingRoutes from '../modules/buildings/buildings.routes';
import apartmentRoutes from '../modules/apartments/apartments.routes';
import residentRoutes from '../modules/residents/residents.routes';
import serviceRoutes from '../modules/services/services.routes';
import invoiceRoutes from '../modules/invoices/invoices.routes';
import newsRoutes from '../modules/news/news.routes';
import complaintRoutes from '../modules/complaints/complaints.routes';
import chatbotRoutes from '../modules/chatbot/chatbot.routes';
import storageRoutes from '../modules/storage/storage.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/buildings', buildingRoutes);
router.use('/apartments', apartmentRoutes);
router.use('/residents', residentRoutes);
router.use('/services', serviceRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/news', newsRoutes);
router.use('/complaints', complaintRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/storage', storageRoutes);

export default router;
