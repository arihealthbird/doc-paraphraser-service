import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { JobQueueService } from './services/jobQueue';
import { ParaphrasingWorker } from './workers/paraphrasingWorker';
import apiRoutes, { attachServices } from './routes/api';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for frontend
app.use(express.static(path.join(__dirname, '../public')));

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Initialize services
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('ERROR: OPENROUTER_API_KEY is not set in environment variables');
  process.exit(1);
}

const jobQueue = new JobQueueService(redisConnection);
const worker = new ParaphrasingWorker(apiKey, redisConnection);

// Attach services to routes
attachServices(jobQueue, worker);

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await jobQueue.close();
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await jobQueue.close();
  await worker.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Document Paraphraser Service running on port ${PORT}`);
  console.log(`📝 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🔄 Paraphrase endpoint: http://localhost:${PORT}/api/paraphrase`);
  console.log(`📊 Job status endpoint: http://localhost:${PORT}/api/job/:jobId`);
  console.log(`⬇️  Download endpoint: http://localhost:${PORT}/api/download/:documentId`);
});
