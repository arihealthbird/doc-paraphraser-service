import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
const pdf = require('pdf-parse');

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
}

export class DocumentExtractor {
  async extractText(filePath: string, fileType: string): Promise<ExtractedDocument> {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.extractFromPDF(filePath);
      case 'docx':
        return this.extractFromDOCX(filePath);
      case 'txt':
        return this.extractFromTXT(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async extractFromPDF(filePath: string): Promise<ExtractedDocument> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      pageCount: data.numpages,
      wordCount: this.countWords(data.text),
    };
  }

  private async extractFromDOCX(filePath: string): Promise<ExtractedDocument> {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    return {
      text,
      wordCount: this.countWords(text),
    };
  }

  private async extractFromTXT(filePath: string): Promise<ExtractedDocument> {
    const text = await fs.readFile(filePath, 'utf-8');
    
    return {
      text,
      wordCount: this.countWords(text),
    };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}
