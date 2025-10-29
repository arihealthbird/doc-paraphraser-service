import { Worker, Job } from 'bullmq';
import { ParaphrasingEngine } from '../services/paraphrasingEngine';
import { DocumentExtractor } from '../utils/documentExtractor';
import { ProcessingJob, ParaphrasingConfig } from '../types';
import fs from 'fs/promises';
import path from 'path';

interface JobData {
  jobId: string;
  documentId: string;
  filePath: string;
  fileType: string;
  config: ParaphrasingConfig;
}

export class ParaphrasingWorker {
  private worker: Worker;
  private engine: ParaphrasingEngine;
  private extractor: DocumentExtractor;
  private jobStatuses: Map<string, ProcessingJob>;

  constructor(apiKey: string, redisConnection: any) {
    this.engine = new ParaphrasingEngine(apiKey);
    this.extractor = new DocumentExtractor();
    this.jobStatuses = new Map();

    this.worker = new Worker(
      'paraphrasing-queue',
      async (job: Job<JobData>) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 1, // Process one job at a time to respect rate limits
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  private async processJob(job: Job<JobData>): Promise<string> {
    const { jobId, documentId, filePath, fileType, config } = job.data;

    try {
      // Update job status
      this.updateJobStatus(jobId, {
        jobId,
        documentId,
        status: 'processing',
        progress: 0,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Extract text from document
      await job.updateProgress(10);
      console.log(`Extracting text from ${filePath}...`);
      const extracted = await this.extractor.extractText(filePath, fileType);

      // Paraphrase document with progress tracking
      await job.updateProgress(20);
      console.log(`Starting paraphrasing process...`);
      
      const paraphrasedText = await this.engine.paraphraseDocument(
        extracted.text,
        config,
        (progress, current, total) => {
          // Map paraphrasing progress to 20-90% of overall job
          const overallProgress = 20 + Math.round((progress / 100) * 70);
          job.updateProgress(overallProgress);
          
          this.updateJobStatus(jobId, {
            jobId,
            documentId,
            status: 'processing',
            progress: overallProgress,
            config,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      );

      // Save paraphrased document
      await job.updateProgress(90);
      const outputPath = await this.saveParaphrasedDocument(
        documentId,
        fileType,
        paraphrasedText
      );

      // Mark as completed
      await job.updateProgress(100);
      this.updateJobStatus(jobId, {
        jobId,
        documentId,
        status: 'completed',
        progress: 100,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
        outputPath,
      });

      return outputPath;
    } catch (error: any) {
      console.error(`Error processing job ${jobId}:`, error);
      
      this.updateJobStatus(jobId, {
        jobId,
        documentId,
        status: 'failed',
        progress: 0,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
        error: error.message,
      });

      throw error;
    }
  }

  private async saveParaphrasedDocument(
    documentId: string,
    fileType: string,
    content: string
  ): Promise<string> {
    const outputDir = path.join(process.cwd(), 'uploads', 'processed');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFileName = `${documentId}_paraphrased.${fileType}`;
    const outputPath = path.join(outputDir, outputFileName);

    // For now, save as text. Could be enhanced to save in original format
    await fs.writeFile(outputPath, content, 'utf-8');

    return outputPath;
  }

  private updateJobStatus(jobId: string, status: ProcessingJob): void {
    this.jobStatuses.set(jobId, status);
  }

  public getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.jobStatuses.get(jobId);
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
