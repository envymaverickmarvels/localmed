import { Worker, Job } from 'bullmq';
import { getRedis } from '../config/redis';
import { getDb } from '../config/database';
import { QUEUE_NAMES, PrescriptionOcrJob } from './queues';

// Mock OCR processing - in production, integrate with Google Vision API or Tesseract
async function processOcr(imageUrl: string): Promise<string> {
  // Simulate OCR processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // In production, this would call Google Vision API or Tesseract
  // For now, return a mock result
  return `
    Prescription
    Date: ${new Date().toLocaleDateString()}

    1. Paracetamol 500mg - 1 tablet thrice daily
    2. Azithromycin 500mg - 1 tablet daily for 5 days
    3. Omeprazole 20mg - 1 capsule daily before breakfast
  `;
}

// Extract medicines from OCR text using NLP patterns
function extractMedicines(ocrText: string): Array<{ name: string; confidence: number }> {
  const medicines: Array<{ name: string; confidence: number }> = [];

  // Common medicine patterns
  const patterns = [
    /([A-Z][a-zA-Z]+)\s*(\d+\s*(?:mg|ml|g|mcg))?/gi,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(\d+\s*(?:mg|ml|g|mcg))?/gi,
  ];

  // Extract potential medicine names
  const lines = ocrText.split('\n');
  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const name = match[1].trim();
        // Filter out common non-medicine words
        const skipWords = ['Prescription', 'Date', 'Dr', 'Doctor', 'Patient', 'Rx'];
        if (!skipWords.includes(name) && name.length > 3) {
          medicines.push({
            name,
            confidence: 0.8,
          });
        }
      }
    }
  }

  // Remove duplicates
  const uniqueMedicines = Array.from(
    new Map(medicines.map((m) => [m.name, m])).values()
  );

  return uniqueMedicines;
}

// Match extracted medicines to catalog
async function matchMedicinesToCatalog(
  extractedMedicines: Array<{ name: string; confidence: number }>
): Promise<Array<{ name: string; confidence: number; medicineId: string | null }>> {
  const db = getDb();
  const results: Array<{ name: string; confidence: number; medicineId: string | null }> = [];

  for (const med of extractedMedicines) {
    // Try to find matching medicine in catalog
    const match = await db('medicines')
      .where('is_active', true)
      .whereRaw('LOWER(name) LIKE ?', [`%${med.name.toLowerCase()}%`])
      .orWhereRaw('LOWER(generic_name) LIKE ?', [`%${med.name.toLowerCase()}%`])
      .first();

    results.push({
      name: med.name,
      confidence: med.confidence,
      medicineId: match?.id || null,
    });
  }

  return results;
}

export function createPrescriptionOcrWorker(): Worker<PrescriptionOcrJob> {
  const worker = new Worker<PrescriptionOcrJob>(
    QUEUE_NAMES.PRESCRIPTION_OCR,
    async (job: Job<PrescriptionOcrJob>) => {
      const { prescriptionId, imageUrl } = job.data;
      console.log(`Processing prescription OCR for: ${prescriptionId}`);

      const db = getDb();

      try {
        // Update status to processing
        await db('prescriptions')
          .where({ id: prescriptionId })
          .update({ status: 'PROCESSING', updated_at: new Date() });

        // Perform OCR
        const ocrText = await processOcr(imageUrl);

        // Extract medicines
        const extractedMedicines = extractMedicines(ocrText);

        // Match to catalog
        const matchedMedicines = await matchMedicinesToCatalog(extractedMedicines);

        // Calculate confidence score
        const matchedCount = matchedMedicines.filter((m) => m.medicineId).length;
        const confidence =
          matchedMedicines.length > 0
            ? (matchedCount / matchedMedicines.length) * 100
            : 0;

        // Update prescription with results
        await db('prescriptions')
          .where({ id: prescriptionId })
          .update({
            status: 'PROCESSED',
            ocr_text: ocrText,
            extracted_medicines: JSON.stringify(matchedMedicines),
            confidence,
            processed_at: new Date(),
            updated_at: new Date(),
          });

        console.log(`Prescription ${prescriptionId} processed successfully`);
      } catch (error) {
        console.error(`Failed to process prescription ${prescriptionId}:`, error);

        // Update status to failed
        await db('prescriptions')
          .where({ id: prescriptionId })
          .update({
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
    console.log(`Prescription OCR job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Prescription OCR job ${job?.id} failed:`, err);
  });

  return worker;
}