# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Document paraphrasing service using OpenRouter API to process large documents (700+ pages). Built with TypeScript, Express, BullMQ, and Redis for async job processing.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with auto-reload
npm run build        # Compile TypeScript to dist/
npm start            # Run production build from dist/
```

### Prerequisites Setup
```bash
# Start Redis (required for job queue)
brew services start redis                    # macOS
sudo systemctl start redis                   # Linux
docker run -d -p 6379:6379 redis:alpine     # Docker

# Configure environment
cp .env.example .env
# Then add your OPENROUTER_API_KEY to .env
```

## Architecture

### Request Flow
1. **Upload** → Express multer middleware saves file to `uploads/`
2. **Paraphrase request** → JobQueueService adds BullMQ job to Redis queue
3. **Worker** → ParaphrasingWorker picks up job, extracts text, processes via OpenRouter
4. **Chunking** → Large documents split into 4000-char chunks with 200-char overlap
5. **Processing** → Each chunk sent to OpenRouter API with 1s delay between chunks
6. **Reconstruction** → Chunks reassembled with overlap detection and removal
7. **Output** → Saved to `uploads/processed/` as text file

### Service Layer Pattern

**Core Services:**
- `JobQueueService` - BullMQ queue management (add jobs, check status)
- `ParaphrasingEngine` - Orchestrates chunking, API calls, and reconstruction
- `OpenRouterService` - Direct API wrapper with prompt engineering
- `ParaphrasingWorker` - BullMQ worker that processes queued jobs

**Key Design Notes:**
- Worker concurrency set to 1 to respect API rate limits
- Progress tracked at two levels: worker updates BullMQ progress (0-100%), engine reports chunk progress
- Job status stored in-memory in worker (Map<jobId, ProcessingJob>)
- Graceful shutdown handlers close BullMQ connections cleanly

### Prompt Engineering Strategy

OpenRouterService builds prompts from:
- **Tone** (formal/casual/neutral) → modifies instruction style
- **Formality** (high/medium/low) → controls vocabulary complexity
- **Creativity** (conservative/moderate/creative) → maps to temperature (0.3/0.6/0.9)
- System prompt emphasizes: maintain meaning, avoid plagiarism, no hallucination, preserve/reorganize formatting based on config

### Chunking & Overlap Handling

`TextChunker` splits on sentence boundaries when possible (4000 chars max, 200 char overlap). `ParaphrasingEngine.removeOverlap()` attempts to detect repeated content by comparing last 3 sentences of previous chunk with start of current chunk.

## API Endpoints

```
POST /api/upload          - Upload document (returns documentId)
POST /api/paraphrase      - Start job (returns jobId)
GET  /api/job/:jobId      - Check progress/status
GET  /api/download/:documentId?fileType=txt
GET  /api/health          - Service health check
```

## Environment Variables

Required:
- `OPENROUTER_API_KEY` - Must be set or service exits

Optional:
- `PORT` (default: 3000)
- `REDIS_HOST` (default: localhost)
- `REDIS_PORT` (default: 6379)

## Known Limitations

- Output is always text format regardless of input (PDF/DOCX formatting not preserved in output)
- Job status stored in-memory only (lost on restart)
- No authentication/rate limiting per user
- Large documents process sequentially due to concurrency: 1

## File Structure Notes

```
src/
├── index.ts                      # Server init, service wiring, graceful shutdown
├── routes/api.ts                 # Express route handlers
├── services/
│   ├── jobQueue.ts               # BullMQ queue wrapper
│   ├── openRouterService.ts      # OpenRouter API client
│   └── paraphrasingEngine.ts     # Core paraphrasing orchestrator
├── workers/
│   └── paraphrasingWorker.ts     # BullMQ worker process
├── utils/
│   ├── documentExtractor.ts      # pdf-parse, mammoth for text extraction
│   └── chunker.ts                # Smart text chunking with overlap
└── types/index.ts                # Shared TypeScript interfaces
```

When modifying the paraphrasing logic, the key methods are:
- `OpenRouterService.buildSystemPrompt()` - prompt engineering
- `ParaphrasingEngine.paraphraseDocument()` - orchestration with progress
- `ParaphrasingEngine.reconstructDocument()` - chunk reassembly
