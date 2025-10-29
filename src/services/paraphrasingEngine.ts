import { OpenRouterService } from './openRouterService';
import { TextChunker } from '../utils/chunker';
import { ParaphrasingConfig, ParaphrasedChunk, ChunkMetadata } from '../types';

export class ParaphrasingEngine {
  private openRouterService: OpenRouterService;
  private chunker: TextChunker;

  constructor(apiKey: string, maxChunkSize: number = 4000) {
    this.openRouterService = new OpenRouterService(apiKey);
    this.chunker = new TextChunker(maxChunkSize);
  }

  /**
   * Paraphrase an entire document with progress tracking
   */
  async paraphraseDocument(
    text: string,
    config: ParaphrasingConfig,
    onProgress?: (progress: number, currentChunk: number, totalChunks: number) => void
  ): Promise<string> {
    // Split document into chunks
    const chunks = this.chunker.chunkText(text);
    const totalChunks = chunks.length;
    
    console.log(`Processing document in ${totalChunks} chunks...`);

    const paraphrasedChunks: ParaphrasedChunk[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Processing chunk ${i + 1}/${totalChunks}...`);
        
        const paraphrasedText = await this.openRouterService.paraphraseText(
          chunk.text,
          config
        );

        paraphrasedChunks.push({
          chunkIndex: i,
          originalText: chunk.text,
          paraphrasedText,
        });

        // Report progress
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        if (onProgress) {
          onProgress(progress, i + 1, totalChunks);
        }

        // Add a small delay to respect rate limits
        if (i < chunks.length - 1) {
          await this.delay(1000);
        }
      } catch (error: any) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw new Error(`Failed at chunk ${i + 1}/${totalChunks}: ${error.message}`);
      }
    }

    // Reconstruct the document
    return this.reconstructDocument(paraphrasedChunks, chunks);
  }

  /**
   * Reconstruct the full document from paraphrased chunks
   */
  private reconstructDocument(
    paraphrasedChunks: ParaphrasedChunk[],
    originalChunks: ChunkMetadata[]
  ): string {
    // Sort by chunk index to ensure correct order
    const sortedChunks = paraphrasedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    // Join chunks, removing overlap where detected
    let reconstructed = '';
    
    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      
      if (i === 0) {
        // First chunk - add as is
        reconstructed = chunk.paraphrasedText;
      } else {
        // Subsequent chunks - try to detect and remove overlap
        const previousChunk = sortedChunks[i - 1];
        const cleanedChunk = this.removeOverlap(
          previousChunk.paraphrasedText,
          chunk.paraphrasedText
        );
        
        // Add spacing between chunks if needed
        if (!reconstructed.endsWith('\n\n')) {
          reconstructed += '\n\n';
        }
        
        reconstructed += cleanedChunk;
      }
    }
    
    return reconstructed.trim();
  }

  /**
   * Attempt to remove overlap between consecutive chunks
   */
  private removeOverlap(previousText: string, currentText: string): string {
    // Get last few sentences of previous text
    const previousSentences = previousText.split(/[.!?]+/).slice(-3);
    
    // Check if current text starts with any of these sentences
    for (let i = 0; i < previousSentences.length; i++) {
      const overlap = previousSentences.slice(i).join('.');
      if (overlap && currentText.startsWith(overlap.trim())) {
        return currentText.slice(overlap.length).trim();
      }
    }
    
    return currentText;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the service connection
   */
  async testConnection(): Promise<boolean> {
    return this.openRouterService.testConnection();
  }
}
