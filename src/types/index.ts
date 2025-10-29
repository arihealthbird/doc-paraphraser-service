export interface ParaphrasingConfig {
  tone?: 'formal' | 'casual' | 'neutral';
  formality?: 'high' | 'medium' | 'low';
  creativity?: 'conservative' | 'moderate' | 'creative';
  preserveFormatting?: boolean;
  model?: string;
}

export interface DocumentMetadata {
  id: string;
  originalFilename: string;
  fileType: 'pdf' | 'docx' | 'txt';
  filePath: string;
  uploadedAt: Date;
  pageCount?: number;
  wordCount?: number;
}

export interface ProcessingJob {
  jobId: string;
  documentId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  config: ParaphrasingConfig;
  createdAt: Date;
  updatedAt: Date;
  outputPath?: string;
  error?: string;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  startPosition: number;
  endPosition: number;
  text: string;
}

export interface ParaphrasedChunk {
  chunkIndex: number;
  originalText: string;
  paraphrasedText: string;
}
