import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import * as inventoryController from './controller';

const router = Router();

// Validation schemas
const addInventorySchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().min(0),
  price: z.number().positive(),
  mrp: z.number().positive(),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  batchNumber: z.string().optional(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

const updateInventorySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  price: z.number().positive().optional(),
  mrp: z.number().positive().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  batchNumber: z.string().optional(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

const inventoryIdSchema = z.object({
  id: z.string().uuid(),
});

const pharmacyIdSchema = z.object({
  pharmacyId: z.string().uuid(),
});

const getInventorySchema = z.object({
  pharmacyId: z.string().uuid(),
  category: z.string().optional(),
  lowStock: z.string().transform(Boolean).optional(),
  expiringSoon: z.string().transform(Boolean).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('50'),
});

const stockAdjustmentSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(5).max(500),
});

// Get inventory for a pharmacy
router.get('/pharmacy/:pharmacyId', authenticate, requireActiveSession, validateParams(pharmacyIdSchema), validateQuery(getInventorySchema), inventoryController.getPharmacyInventory);

// Add inventory item
router.post('/pharmacy/:pharmacyId', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(pharmacyIdSchema), validateBody(addInventorySchema), inventoryController.addInventoryItem);

// Update inventory item
router.patch('/:id', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(inventoryIdSchema), validateBody(updateInventorySchema), inventoryController.updateInventoryItem);

// Adjust stock (increase/decrease)
router.post('/:id/adjust-stock', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(inventoryIdSchema), validateBody(stockAdjustmentSchema), inventoryController.adjustStock);

// Delete inventory item
router.delete('/:id', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(inventoryIdSchema), inventoryController.deleteInventoryItem);

// Get low stock alerts
router.get('/alerts/low-stock', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), inventoryController.getLowStockAlerts);

// Get expiring soon alerts
router.get('/alerts/expiring-soon', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), inventoryController.getExpiringSoonAlerts);

export default router;