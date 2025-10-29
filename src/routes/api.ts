import express, { Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { JobQueueService } from '../services/jobQueue';
import { ParaphrasingWorker } from '../workers/paraphrasingWorker';
import { ParaphrasingConfig } from '../types';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'original');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

// Middleware to attach services
export function attachServices(
  jobQueue: JobQueueService,
  worker: ParaphrasingWorker
) {
  router.use((req: any, res, next) => {
    req.jobQueue = jobQueue;
    req.worker = worker;
    next();
  });
  
  return router;
}

/**
 * POST /api/upload
 * Upload a document
 */
router.post('/upload', upload.single('document'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentId = path.parse(req.file.filename).name;
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();

    res.json({
      documentId,
      originalFilename: req.file.originalname,
      fileType,
      filePath: req.file.path,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/paraphrase
 * Start a paraphrasing job
 */
router.post('/paraphrase', async (req: any, res: Response) => {
  try {
    const { documentId, filePath, fileType, config } = req.body;

    if (!documentId || !filePath || !fileType) {
      return res.status(400).json({ 
        error: 'Missing required fields: documentId, filePath, fileType' 
      });
    }

    const paraphrasingConfig: ParaphrasingConfig = {
      tone: config?.tone || 'neutral',
      formality: config?.formality || 'medium',
      creativity: config?.creativity || 'moderate',
      preserveFormatting: config?.preserveFormatting !== false,
      model: config?.model,
    };

    const jobId = await req.jobQueue.addJob(
      documentId,
      filePath,
      fileType,
      paraphrasingConfig
    );

    res.json({
      jobId,
      status: 'queued',
      message: 'Paraphrasing job started',
    });
  } catch (error: any) {
    console.error('Paraphrase error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/job/:jobId
 * Get job status
 */
router.get('/job/:jobId', async (req: any, res: Response) => {
  try {
    const { jobId } = req.params;

    const status = req.worker.getJobStatus(jobId);
    const progress = await req.jobQueue.getJobProgress(jobId);
    const state = await req.jobQueue.getJobState(jobId);

    if (!status && !state) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      status: status?.status || state || 'unknown',
      progress: status?.progress || progress || 0,
      outputPath: status?.outputPath,
      error: status?.error,
      updatedAt: status?.updatedAt,
    });
  } catch (error: any) {
    console.error('Job status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/download/:documentId
 * Download processed document
 */
router.get('/download/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { fileType = 'txt' } = req.query;

    const fileName = `${documentId}_paraphrased.${fileType}`;
    const filePath = path.join(process.cwd(), 'uploads', 'processed', fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Processed document not found' });
    }

    res.download(filePath, fileName);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
