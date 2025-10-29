# 📝 Document Paraphraser Service

A powerful document paraphrasing service that uses the OpenRouter API to process large documents (700+ pages) with customizable paraphrasing settings. Built with Node.js, TypeScript, Express, and BullMQ for robust async job processing.

## ✨ Features

- **Large Document Support**: Process documents with 700+ pages
- **Multiple File Formats**: Supports PDF, DOCX, and TXT files
- **Customizable Paraphrasing**: Control tone, formality, and creativity levels
- **Async Processing**: Queue-based system for handling long-running jobs
- **Progress Tracking**: Real-time progress updates during processing
- **User-Friendly Interface**: Clean web interface for document upload and configuration
- **OpenRouter Integration**: Leverages OpenRouter API for high-quality AI paraphrasing

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Redis server (for job queue)
- OpenRouter API key ([Get one here](https://openrouter.ai/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd doc-paraphraser-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_actual_api_key_here
   ```

4. **Start Redis** (if not already running):
   ```bash
   # macOS with Homebrew
   brew services start redis
   
   # Linux
   sudo systemctl start redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

5. **Run the service**:
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

6. **Open your browser**:
   Navigate to `http://localhost:3000`

## 📖 API Documentation

### Endpoints

#### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Body:
- document: File (PDF, DOCX, or TXT, max 100MB)

Response:
{
  "documentId": "uuid",
  "originalFilename": "document.pdf",
  "fileType": "pdf",
  "filePath": "/path/to/file",
  "size": 1234567
}
```

#### Start Paraphrasing Job
```http
POST /api/paraphrase
Content-Type: application/json

Body:
{
  "documentId": "uuid",
  "filePath": "/path/to/file",
  "fileType": "pdf",
  "config": {
    "tone": "neutral" | "formal" | "casual",
    "formality": "high" | "medium" | "low",
    "creativity": "conservative" | "moderate" | "creative",
    "preserveFormatting": true,
    "model": "anthropic/claude-3.5-sonnet" // optional
  }
}

Response:
{
  "jobId": "uuid",
  "status": "queued",
  "message": "Paraphrasing job started"
}
```

#### Check Job Status
```http
GET /api/job/:jobId

Response:
{
  "jobId": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "progress": 75,
  "outputPath": "/path/to/output",
  "error": "error message if failed",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Download Processed Document
```http
GET /api/download/:documentId?fileType=txt

Response: File download
```

#### Health Check
```http
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🎨 Configuration Options

### Tone
- **Neutral**: Balanced, standard tone
- **Formal**: Professional, academic style
- **Casual**: Conversational, easy-to-read style

### Formality
- **High**: Sophisticated vocabulary and complex structures
- **Medium**: Balance between clarity and sophistication
- **Low**: Simple, accessible language

### Creativity
- **Conservative**: Minimal changes, close to original (temperature: 0.3)
- **Moderate**: Balanced rephrasing (temperature: 0.6)
- **Creative**: More varied rephrasing (temperature: 0.9)

## 🏗️ Architecture

```
src/
├── index.ts              # Main server entry point
├── types/                # TypeScript type definitions
│   └── index.ts
├── services/             # Business logic services
│   ├── openRouterService.ts    # OpenRouter API integration
│   ├── paraphrasingEngine.ts   # Core paraphrasing logic
│   └── jobQueue.ts             # Job queue management
├── workers/              # Background job workers
│   └── paraphrasingWorker.ts   # Async document processing
├── routes/               # API route handlers
│   └── api.ts
├── utils/                # Utility functions
│   ├── documentExtractor.ts    # Extract text from files
│   └── chunker.ts              # Split large documents
└── public/               # Frontend static files
    └── index.html
```

## 🔧 How It Works

1. **Upload**: User uploads a document (PDF/DOCX/TXT)
2. **Configure**: User selects paraphrasing settings (tone, formality, creativity)
3. **Queue**: System creates a job and adds it to the processing queue
4. **Extract**: Worker extracts text from the document
5. **Chunk**: Large documents are split into manageable chunks (4000 chars with 200 char overlap)
6. **Paraphrase**: Each chunk is sent to OpenRouter API for paraphrasing
7. **Reconstruct**: Paraphrased chunks are reassembled into the full document
8. **Save**: Processed document is saved for download
9. **Download**: User downloads the paraphrased document

## 📦 Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Queue System**: BullMQ + Redis
- **AI Provider**: OpenRouter API
- **Document Processing**: pdf-parse, mammoth
- **File Upload**: Multer
- **Frontend**: Vanilla HTML/CSS/JavaScript

## 🐳 Docker Support

```dockerfile
# Dockerfile (create this if needed)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml (create this if needed)
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | Your OpenRouter API key |
| `PORT` | No | 3000 | Server port |
| `REDIS_HOST` | No | localhost | Redis host |
| `REDIS_PORT` | No | 6379 | Redis port |

## 🚧 Known Limitations

- Currently outputs paraphrased documents as text files (PDF/DOCX formatting preservation coming soon)
- Large documents (700+ pages) may take significant time to process
- Rate limiting depends on your OpenRouter API plan

## 🛣️ Roadmap

- [ ] Preserve original document formatting in output
- [ ] Support for more file formats (RTF, ODT, etc.)
- [ ] Batch processing of multiple documents
- [ ] Document comparison view (original vs paraphrased)
- [ ] API authentication and user management
- [ ] Advanced settings (custom prompts, temperature control)
- [ ] Export to multiple formats

## 📄 License

ISC

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for providing AI API access
- Built with ❤️ using Node.js and TypeScript

---

**Need help?** Open an issue or reach out to the maintainers.
