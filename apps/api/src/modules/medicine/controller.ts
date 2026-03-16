import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middleware/error-handling';

interface SearchQuery {
  q: string;
  page: number;
  limit: number;
  category?: string;
  form?: string;
  schedule?: string;
}

interface CreateMedicineBody {
  name: string;
  genericName?: string;
  brandName?: string;
  category?: string;
  form: string;
  strength?: string;
  manufacturer?: string;
  schedule?: string;
  description?: string;
  usageInstructions?: string;
  storageInstructions?: string;
  sideEffects?: string[];
  drugInteractions?: string[];
  contraindications?: string[];
}

// Search medicines with full-text and fuzzy search
export async function search(req: Request, res: Response): Promise<void> {
  const { q, page, limit, category, form, schedule } = req.query as unknown as SearchQuery;
  const offset = (page - 1) * limit;

  const db = getDb();

  // Build the query with full-text and trigram search
  let query = db('medicines')
    .select('*')
    .where('is_active', true)
    .modify((qb) => {
      // Full-text search on name
      qb.whereRaw("to_tsvector('english', name) @@ plainto_tsquery(?)", [q]);

      // Fuzzy search fallback using pg_trgm
      // This provides better results for typos and partial matches
    });

  // Apply filters
  if (category) {
    query = query.where('category', 'ilike', category);
  }
  if (form) {
    query = query.where('form', form);
  }
  if (schedule) {
    query = query.where('schedule', schedule);
  }

  // Get total count
  const totalQuery = query.clone();
  const [{ count }] = await totalQuery.count('id as count');
  const total = Number(count);

  // Get paginated results with relevance ranking
  const medicines = await query
    .orderByRaw("similarity(name, ?) DESC", [q])
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      medicines,
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

// Get search suggestions (autocomplete)
export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    res.json({ success: true, data: { suggestions: [] } });
    return;
  }

  const db = getDb();

  // Use pg_trgm for fuzzy matching suggestions
  const suggestions = await db('medicines')
    .select('id', 'name', 'generic_name', 'brand_name')
    .where('is_active', true)
    .whereRaw("name ILIKE ?", [`%${q}%`])
    .orWhereRaw("generic_name ILIKE ?", [`%${q}%`])
    .orWhereRaw("brand_name ILIKE ?", [`%${q}%`])
    .orderByRaw("similarity(name, ?) DESC", [q])
    .limit(10);

  res.json({
    success: true,
    data: {
      suggestions: suggestions.map(s => ({
        id: s.id,
        name: s.name,
        genericName: s.generic_name,
        brandName: s.brand_name,
      })),
    },
  });
}

// Get medicine by ID
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const medicine = await db('medicines')
    .where({ id, is_active: true })
    .first();

  if (!medicine) {
    throw NotFoundError('Medicine');
  }

  // Get synonyms
  const synonyms = await db('medicine_synonyms')
    .where({ medicine_id: id })
    .pluck('synonym');

  res.json({
    success: true,
    data: {
      ...medicine,
      synonyms,
    },
  });
}

// Create medicine (Admin only)
export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateMedicineBody;
  const db = getDb();

  const medicineId = uuidv4();

  await db('medicines').insert({
    id: medicineId,
    name: body.name,
    generic_name: body.genericName || null,
    brand_name: body.brandName || null,
    category: body.category || null,
    form: body.form,
    strength: body.strength || null,
    manufacturer: body.manufacturer || null,
    schedule: body.schedule || 'OTC',
    description: body.description || null,
    usage_instructions: body.usageInstructions || null,
    storage_instructions: body.storageInstructions || null,
    side_effects: body.sideEffects ? JSON.stringify(body.sideEffects) : null,
    drug_interactions: body.drugInteractions ? JSON.stringify(body.drugInteractions) : null,
    contraindications: body.contraindications ? JSON.stringify(body.contraindications) : null,
    is_active: true,
  });

  const medicine = await db('medicines').where({ id: medicineId }).first();

  res.status(201).json({
    success: true,
    data: medicine,
  });
}

// Update medicine (Admin only)
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as Partial<CreateMedicineBody>;
  const db = getDb();

  const existing = await db('medicines').where({ id }).first();
  if (!existing) {
    throw NotFoundError('Medicine');
  }

  const updates: Record<string, any> = { updated_at: new Date() };

  if (body.name) updates.name = body.name;
  if (body.genericName !== undefined) updates.generic_name = body.genericName || null;
  if (body.brandName !== undefined) updates.brand_name = body.brandName || null;
  if (body.category !== undefined) updates.category = body.category || null;
  if (body.form) updates.form = body.form;
  if (body.strength !== undefined) updates.strength = body.strength || null;
  if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer || null;
  if (body.schedule) updates.schedule = body.schedule;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.usageInstructions !== undefined) updates.usage_instructions = body.usageInstructions || null;
  if (body.storageInstructions !== undefined) updates.storage_instructions = body.storageInstructions || null;
  if (body.sideEffects !== undefined) updates.side_effects = body.sideEffects ? JSON.stringify(body.sideEffects) : null;
  if (body.drugInteractions !== undefined) updates.drug_interactions = body.drugInteractions ? JSON.stringify(body.drugInteractions) : null;
  if (body.contraindications !== undefined) updates.contraindications = body.contraindications ? JSON.stringify(body.contraindications) : null;

  await db('medicines').where({ id }).update(updates);

  const medicine = await db('medicines').where({ id }).first();

  res.json({
    success: true,
    data: medicine,
  });
}

// Soft delete medicine (Admin only)
export async function deleteMedicine(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const existing = await db('medicines').where({ id }).first();
  if (!existing) {
    throw NotFoundError('Medicine');
  }

  await db('medicines').where({ id }).update({ is_active: false });

  res.json({
    success: true,
    data: { message: 'Medicine deactivated successfully' },
  });
}