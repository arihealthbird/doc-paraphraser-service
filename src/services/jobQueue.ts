import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { ParaphrasingConfig } from '../types';

export class JobQueueService {
  private queue: Queue;

  constructor(redisConnection: any) {
    this.queue = new Queue('paraphrasing-queue', {
      connection: redisConnection,
    });
  }

  async addJob(
    documentId: string,
    filePath: string,
    fileType: string,
    config: ParaphrasingConfig
  ): Promise<string> {
    const jobId = uuidv4();

    await this.queue.add(
      'paraphrase-document',
      {
        jobId,
        documentId,
        filePath,
        fileType,
        config,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    return jobId;
  }

  async getJobProgress(jobId: string): Promise<number | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    return job.progress as number || 0;
  }

  async getJobState(jobId: string): Promise<string | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    return await job.getState();
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
