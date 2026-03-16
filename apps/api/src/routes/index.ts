import { Router } from 'express';

const router = Router();

// Import route modules
import authRoutes from '../modules/auth/routes';
import medicineRoutes from '../modules/medicine/routes';
import pharmacyRoutes from '../modules/pharmacy/routes';
import inventoryRoutes from '../modules/inventory/routes';
import searchRoutes from '../modules/search/routes';
import reservationRoutes from '../modules/reservation/routes';
import deliveryRoutes from '../modules/delivery/routes';
import prescriptionRoutes from '../modules/prescription/routes';
import notificationRoutes from '../modules/notification/routes';
import userRoutes from '../modules/user/routes';
import adminRoutes from '../modules/admin/routes';

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/medicines', medicineRoutes);
router.use('/pharmacies', pharmacyRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/search', searchRoutes);
router.use('/reservations', reservationRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export function setupRoutes(): Router {
  return router;
}

export default router;