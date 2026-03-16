import { Worker, Job } from 'bullmq';
import { getRedis } from '../../config/redis';
import { getDb } from '../../config/database';
import { logger } from '../../config/logger';
import { QUEUE_NAMES, PrescriptionOcrJob } from './queues';
import { sendPrescriptionProcessedNotification } from './notification.worker';

// OCR Service Interface
export interface OcrResult {
  text: string;
  confidence: number;
  blocks?: Array<{
    text: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

// Medicine Extraction Result
export interface ExtractedMedicine {
  name: string;
  confidence: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  matchedMedicineId?: string;
}

// OCR Service - Google Cloud Vision / Tesseract
export class OcrService {
  private useGoogleVision: boolean;

  constructor() {
    this.useGoogleVision = !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEYFILE);
  }

  async processImage(imageUrl: string): Promise<OcrResult> {
    if (this.useGoogleVision) {
      return this.processWithGoogleVision(imageUrl);
    }
    return this.processWithTesseract(imageUrl);
  }

  private async processWithGoogleVision(imageUrl: string): Promise<OcrResult> {
    try {
      // In production, use @google-cloud/vision library
      // For now, this is a placeholder
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { source: { imageUri: imageUrl } },
                features: [
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                  { type: 'TEXT_DETECTION', maxResults: 10 },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (data.responses && data.responses[0]) {
        const fullText = data.responses[0].fullTextAnnotation;
        return {
          text: fullText?.text || '',
          confidence: fullText?.pages?.[0]?.confidence || 0.8,
          blocks: fullText?.pages?.[0]?.blocks?.map((block: any) => ({
            text: block.text,
            confidence: block.confidence || 0.8,
            boundingBox: block.boundingBox,
          })),
        };
      }

      return { text: '', confidence: 0 };
    } catch (error) {
      logger.error('Google Vision OCR failed', { error, imageUrl });
      throw error;
    }
  }

  private async processWithTesseract(imageUrl: string): Promise<OcrResult> {
    // Fallback to Tesseract
    // In production, use tesseract.js or spawn tesseract process
    // For development, return mock data
    logger.info('Using Tesseract fallback for OCR', { imageUrl });

    // Mock implementation for development
    return {
      text: 'Mock OCR text for development',
      confidence: 0.75,
    };
  }
}

// Medicine Name Extraction using NLP patterns
export class MedicineExtractor {
  // Common dosage patterns
  private static readonly DOSAGE_PATTERNS = [
    /(\d+)\s*(?:mg|ml|g|mcg|IU)/gi,
    /(\d+)\s*(?:tablet|capsule|pill|bottle|strip)/gi,
  ];

  // Common frequency patterns
  private static readonly FREQUENCY_PATTERNS = [
    /(?:once|twice|thrice)\s*(?:daily|a\s*day)/gi,
    /(\d+)\s*(?:times?\s*(?:a\s*day|daily)?)/gi,
    /(?:every\s*(?:morning|evening|night|day|hour))/gi,
    /(?:morning|evening|night|bedtime)/gi,
    /(?:OD|BD|TDS|QID|PRN|SOS)/gi,
  ];

  // Duration patterns
  private static readonly DURATION_PATTERNS = [
    /for\s*(\d+)\s*(?:days?|weeks?|months?)/gi,
    /(\d+)\s*(?:days?|weeks?|months?)\s*(?:course|supply)/gi,
    /(?:continue|take)\s*for\s*(\d+)/gi,
  ];

  // Common medicine name patterns
  private static readonly MEDICINE_PATTERNS = [
    // Captures medicine names followed by dosage
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(\d+\s*(?:mg|ml|g|mcg|IU))/gi,
    // Captures generic names
    /\b([A-Za-z]+(?:cillin|mycin|oxacin|pril|olol|sartan|statin|idine|pine|zole|cet|caine|tamine|xetine))\b/gi,
    // Captures brand names
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\d+\s*mg)?/g,
  ];

  // Common words to skip
  private static readonly STOP_WORDS = new Set([
    'take', 'tablet', 'capsule', 'daily', 'twice', 'once', 'orally',
    'mouth', 'with', 'water', 'food', 'empty', 'stomach', 'after',
    'before', 'meals', 'doctor', 'patient', 'name', 'age', 'sex',
    'diagnosis', 'prescription', 'date', 'signature', 'dr', 'doctor',
  ]);

  static extractMedicines(ocrText: string): ExtractedMedicine[] {
    const medicines: ExtractedMedicine[] = [];
    const lines = ocrText.split('\n');
    const seen = new Set<string>();

    for (const line of lines) {
      // Skip empty lines and common headers
      if (!line.trim() || this.isHeader(line)) continue;

      // Try to extract medicine name from the line
      const extracted = this.extractFromLine(line);

      for (const med of extracted) {
        const key = med.name.toLowerCase();
        if (!seen.has(key) && !this.STOP_WORDS.has(key)) {
          seen.add(key);
          medicines.push(med);
        }
      }
    }

    return medicines;
  }

  private static isHeader(line: string): boolean {
    const headerPatterns = [
      /^rx$/i,
      /^prescription$/i,
      /^date:/i,
      /^patient\s*name/i,
      /^doctor/i,
      /^diagnosis/i,
    ];
    return headerPatterns.some(p => p.test(line.trim()));
  }

  private static extractFromLine(line: string): ExtractedMedicine[] {
    const results: ExtractedMedicine[] = [];

    // Pattern 1: Name followed by dosage
    const dosageMatch = this.MEDICINE_PATTERNS[0].exec(line);
    if (dosageMatch) {
      results.push({
        name: dosageMatch[1].trim(),
        confidence: 0.85,
        dosage: dosageMatch[2],
      });
    }

    // Pattern 2: Generic names
    this.MEDICINE_PATTERNS[1].lastIndex = 0;
    let match;
    while ((match = this.MEDICINE_PATTERNS[1].exec(line)) !== null) {
      results.push({
        name: match[1],
        confidence: 0.9,
      });
    }

    // Extract frequency
    let frequency = '';
    for (const pattern of this.FREQUENCY_PATTERNS) {
      const freqMatch = line.match(pattern);
      if (freqMatch) {
        frequency = freqMatch[0];
        break;
      }
    }

    // Extract duration
    let duration = '';
    for (const pattern of this.DURATION_PATTERNS) {
      const durMatch = line.match(pattern);
      if (durMatch) {
        duration = durMatch[0];
        break;
      }
    }

    // Add frequency and duration to extracted medicines
    for (const med of results) {
      if (frequency) med.frequency = frequency;
      if (duration) med.duration = duration;
    }

    return results;
  }
}

// Prescription OCR Worker
export function createPrescriptionOcrWorker(): Worker<PrescriptionOcrJob> {
  const ocrService = new OcrService();

  const worker = new Worker<PrescriptionOcrJob>(
    QUEUE_NAMES.PRESCRIPTION_OCR,
    async (job: Job<PrescriptionOcrJob>) => {
      const { prescriptionId, imageUrl } = job.data;
      logger.info(`Processing prescription ${prescriptionId}`);

      const db = getDb();

      try {
        // Update status to processing
        await db('prescriptions').where({ id: prescriptionId }).update({
          status: 'PROCESSING',
          updated_at: new Date(),
        });

        // Run OCR
        const ocrResult = await ocrService.processImage(imageUrl);

        // Extract medicines
        const extractedMedicines = MedicineExtractor.extractMedicines(ocrResult.text);

        // Match medicines to catalog
        const matchedMedicines = await matchMedicinesToCatalog(db, extractedMedicines);

        // Calculate overall confidence
        const confidence = matchedMedicines.length > 0
          ? matchedMedicines.reduce((sum, m) => sum + m.confidence, 0) / matchedMedicines.length
          : 0;

        // Update prescription
        await db('prescriptions').where({ id: prescriptionId }).update({
          status: 'PROCESSED',
          ocr_text: ocrResult.text,
          extracted_medicines: JSON.stringify(matchedMedicines),
          confidence,
          processed_at: new Date(),
          updated_at: new Date(),
        });

        // Send notification to user
        await sendPrescriptionProcessedNotification(
          (await db('prescriptions').where({ id: prescriptionId }).first())?.user_id,
          prescriptionId,
          matchedMedicines.length
        );

        logger.info(`Prescription ${prescriptionId} processed successfully`);
      } catch (error) {
        logger.error(`Failed to process prescription ${prescriptionId}`, { error });

        // Update status to failed
        await db('prescriptions').where({ id: prescriptionId }).update({
          status: 'FAILED',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date(),
        });

        throw error;
      }
    },
    {
      connection: getRedis(),
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Prescription OCR job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Prescription OCR job ${job?.id} failed:`, err);
  });

  return worker;
}

// Match extracted medicines to the catalog
async function matchMedicinesToCatalog(
  db: any,
  extractedMedicines: ExtractedMedicine[]
): Promise<ExtractedMedicine[]> {
  const results: ExtractedMedicine[] = [];

  for (const med of extractedMedicines) {
    // Try exact match first
    let match = await db('medicines')
      .where('is_active', true)
      .whereRaw('LOWER(name) = ?', [med.name.toLowerCase()])
      .first();

    // Try partial match
    if (!match) {
      match = await db('medicines')
        .where('is_active', true)
        .whereRaw('LOWER(name) LIKE ?', [`%${med.name.toLowerCase()}%`])
        .orWhereRaw('LOWER(generic_name) LIKE ?', [`%${med.name.toLowerCase()}%`])
        .first();
    }

    // Try brand name match
    if (!match) {
      match = await db('medicines')
        .where('is_active', true)
        .whereRaw('LOWER(brand_name) LIKE ?', [`%${med.name.toLowerCase()}%`])
        .first();
    }

    // Check synonyms
    if (!match) {
      const synonym = await db('medicine_synonyms')
        .whereRaw('LOWER(synonym) LIKE ?', [`%${med.name.toLowerCase()}%`])
        .first();

      if (synonym) {
        match = await db('medicines')
          .where({ id: synonym.medicine_id, is_active: true })
          .first();
      }
    }

    results.push({
      ...med,
      matchedMedicineId: match?.id || undefined,
      confidence: match ? Math.min(med.confidence + 0.1, 1) : med.confidence * 0.5,
    });
  }

  return results;
}

export const ocrService = new OcrService();