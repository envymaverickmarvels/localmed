import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../middleware/error-handling';

// Get inventory for a pharmacy
export async function getPharmacyInventory(req: Request, res: Response): Promise<void> {
  const { pharmacyId } = req.params;
  const { category, lowStock, expiringSoon, page = 1, limit = 50 } = req.query as any;
  const db = getDb();

  // Verify pharmacy exists
  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();
  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  let query = db('inventory as i')
    .join('medicines as m', 'i.medicine_id', 'm.id')
    .select([
      'i.id',
      'i.pharmacy_id',
      'i.quantity',
      'i.price',
      'i.mrp',
      'i.discount_percent',
      'i.batch_number',
      'i.expiry_date',
      'i.is_active',
      'i.last_restocked_at',
      'm.id as medicine_id',
      'm.name as medicine_name',
      'm.generic_name',
      'm.brand_name',
      'm.form',
      'm.strength',
      'm.category',
    ])
    .where('i.pharmacy_id', pharmacyId)
    .where('i.is_active', true);

  if (category) {
    query = query.where('m.category', 'ilike', category);
  }

  if (lowStock === 'true') {
    query = query.where('i.quantity', '<', 10);
  }

  if (expiringSoon === 'true') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    query = query.where('i.expiry_date', '<', threeMonthsFromNow);
  }

  const [{ count }] = await query.clone().count('i.id as count');
  const total = Number(count);

  const inventory = await query
    .orderBy('m.name', 'asc')
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      inventory: inventory.map(i => ({
        id: i.id,
        pharmacyId: i.pharmacy_id,
        medicine: {
          id: i.medicine_id,
          name: i.medicine_name,
          genericName: i.generic_name,
          brandName: i.brand_name,
          form: i.form,
          strength: i.strength,
          category: i.category,
        },
        quantity: i.quantity,
        price: i.price,
        mrp: i.mrp,
        discountPercent: i.discount_percent,
        batchNumber: i.batch_number,
        expiryDate: i.expiry_date,
        isActive: i.is_active,
        lastRestockedAt: i.last_restocked_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
}

// Add inventory item
export async function addInventoryItem(req: Request, res: Response): Promise<void> {
  const { pharmacyId } = req.params;
  const body = req.body;
  const user = (req as any).user;
  const db = getDb();

  // Verify pharmacy ownership
  const pharmacy = await db('pharmacies').where({ id: pharmacyId, owner_id: user.userId }).first();
  if (!pharmacy) {
    throw ForbiddenError('You do not have permission to manage this pharmacy');
  }

  // Verify medicine exists
  const medicine = await db('medicines').where({ id: body.medicineId, is_active: true }).first();
  if (!medicine) {
    throw NotFoundError('Medicine');
  }

  // Check if inventory already exists for this medicine
  const existing = await db('inventory')
    .where({ pharmacy_id: pharmacyId, medicine_id: body.medicineId })
    .first();

  if (existing) {
    // Update quantity
    await db('inventory')
      .where({ id: existing.id })
      .update({
        quantity: existing.quantity + body.quantity,
        price: body.price,
        mrp: body.mrp,
        discount_percent: body.discountPercent ?? existing.discount_percent,
        batch_number: body.batchNumber ?? existing.batch_number,
        expiry_date: body.expiryDate ?? existing.expiry_date,
        last_restocked_at: new Date(),
        updated_at: new Date(),
      });

    const updated = await db('inventory').where({ id: existing.id }).first();

    res.json({
      success: true,
      data: { inventory: updated },
    });
    return;
  }

  // Create new inventory item
  const inventoryId = uuidv4();
  await db('inventory').insert({
    id: inventoryId,
    pharmacy_id: pharmacyId,
    medicine_id: body.medicineId,
    quantity: body.quantity,
    price: body.price,
    mrp: body.mrp,
    discount_percent: body.discountPercent ?? 0,
    batch_number: body.batchNumber || null,
    manufacturing_date: body.manufacturingDate || null,
    expiry_date: body.expiryDate || null,
    is_active: true,
    last_restocked_at: new Date(),
  });

  const inventory = await db('inventory').where({ id: inventoryId }).first();

  res.status(201).json({
    success: true,
    data: { inventory },
  });
}

// Update inventory item
export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body;
  const user = (req as any).user;
  const db = getDb();

  // Get inventory item
  const inventory = await db('inventory').where({ id }).first();
  if (!inventory) {
    throw NotFoundError('Inventory item');
  }

  // Verify ownership
  const pharmacy = await db('pharmacies').where({ id: inventory.pharmacy_id, owner_id: user.userId }).first();
  if (!pharmacy) {
    throw ForbiddenError('You do not have permission to update this inventory');
  }

  const updates: Record<string, any> = { updated_at: new Date() };

  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.price !== undefined) updates.price = body.price;
  if (body.mrp !== undefined) updates.mrp = body.mrp;
  if (body.discountPercent !== undefined) updates.discount_percent = body.discountPercent;
  if (body.batchNumber !== undefined) updates.batch_number = body.batchNumber;
  if (body.manufacturingDate !== undefined) updates.manufacturing_date = body.manufacturingDate;
  if (body.expiryDate !== undefined) updates.expiry_date = body.expiryDate;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  await db('inventory').where({ id }).update(updates);

  const updated = await db('inventory').where({ id }).first();

  res.json({
    success: true,
    data: { inventory: updated },
  });
}

// Adjust stock (increase/decrease)
export async function adjustStock(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { quantity, reason } = req.body;
  const user = (req as any).user;
  const db = getDb();

  // Get inventory item
  const inventory = await db('inventory').where({ id }).first();
  if (!inventory) {
    throw NotFoundError('Inventory item');
  }

  // Verify ownership
  const pharmacy = await db('pharmacies').where({ id: inventory.pharmacy_id, owner_id: user.userId }).first();
  if (!pharmacy) {
    throw ForbiddenError('You do not have permission to update this inventory');
  }

  const newQuantity = inventory.quantity + quantity;

  if (newQuantity < 0) {
    throw BadRequestError('Insufficient stock for this adjustment');
  }

  await db('inventory')
    .where({ id })
    .update({
      quantity: newQuantity,
      last_restocked_at: quantity > 0 ? new Date() : inventory.last_restocked_at,
      updated_at: new Date(),
    });

  // Log the adjustment (could create an audit log table)
  // For now, we'll just update

  const updated = await db('inventory').where({ id }).first();

  res.json({
    success: true,
    data: {
      inventory: updated,
      adjustment: {
        previousQuantity: inventory.quantity,
        adjustment: quantity,
        newQuantity,
        reason,
      },
    },
  });
}

// Delete inventory item (soft delete)
export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  // Get inventory item
  const inventory = await db('inventory').where({ id }).first();
  if (!inventory) {
    throw NotFoundError('Inventory item');
  }

  // Verify ownership
  const pharmacy = await db('pharmacies').where({ id: inventory.pharmacy_id, owner_id: user.userId }).first();
  if (!pharmacy) {
    throw ForbiddenError('You do not have permission to delete this inventory');
  }

  // Soft delete
  await db('inventory').where({ id }).update({ is_active: false, updated_at: new Date() });

  res.json({
    success: true,
    data: { message: 'Inventory item deactivated' },
  });
}

// Get low stock alerts
export async function getLowStockAlerts(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  // Get pharmacy
  const pharmacy = await db('pharmacies').where({ owner_id: user.userId }).first();
  if (!pharmacy) {
    throw BadRequestError('No pharmacy associated with this account');
  }

  const lowStockItems = await db('inventory as i')
    .join('medicines as m', 'i.medicine_id', 'm.id')
    .select([
      'i.id',
      'i.quantity',
      'i.price',
      'm.id as medicine_id',
      'm.name as medicine_name',
      'm.form',
      'm.strength',
    ])
    .where('i.pharmacy_id', pharmacy.id)
    .where('i.is_active', true)
    .where('i.quantity', '<', 10)
    .orderBy('i.quantity', 'asc');

  res.json({
    success: true,
    data: {
      alerts: lowStockItems.map(i => ({
        inventoryId: i.id,
        medicineId: i.medicine_id,
        medicineName: i.medicine_name,
        form: i.form,
        strength: i.strength,
        currentQuantity: i.quantity,
        threshold: 10,
      })),
    },
  });
}

// Get expiring soon alerts
export async function getExpiringSoonAlerts(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  // Get pharmacy
  const pharmacy = await db('pharmacies').where({ owner_id: user.userId }).first();
  if (!pharmacy) {
    throw BadRequestError('No pharmacy associated with this account');
  }

  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const expiringItems = await db('inventory as i')
    .join('medicines as m', 'i.medicine_id', 'm.id')
    .select([
      'i.id',
      'i.quantity',
      'i.expiry_date',
      'i.batch_number',
      'm.id as medicine_id',
      'm.name as medicine_name',
      'm.form',
      'm.strength',
    ])
    .where('i.pharmacy_id', pharmacy.id)
    .where('i.is_active', true)
    .where('i.expiry_date', '<', threeMonthsFromNow)
    .whereNotNull('i.expiry_date')
    .orderBy('i.expiry_date', 'asc');

  res.json({
    success: true,
    data: {
      alerts: expiringItems.map(i => ({
        inventoryId: i.id,
        medicineId: i.medicine_id,
        medicineName: i.medicine_name,
        form: i.form,
        strength: i.strength,
        quantity: i.quantity,
        batchNumber: i.batch_number,
        expiryDate: i.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      })),
    },
  });
}