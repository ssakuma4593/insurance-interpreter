# Insurance Plan Interpreter

An AI-powered web application that helps users understand their insurance plan documents. Upload a PDF, choose your explanation level (Beginner/Intermediate/Advanced), and get personalized summaries and answers with citations.

## Features

- **PDF Upload & Parsing**: Upload insurance plan PDFs with automatic text extraction and page-level tracking
- **Level-Based Explanations**: Choose from Beginner, Intermediate, or Advanced explanation levels
- **Plan Summary**: Get a structured summary of key plan details (deductibles, copays, coverage, etc.)
- **Q&A Chat**: Ask questions about your plan and get answers grounded in your document with citations
- **Confidence Indicators**: See confidence levels (High/Medium/Low) for each answer
- **Citation Support**: Every answer includes page numbers and source snippets
- **Reliability Guardrails**: Refuses to answer when information isn't in the document

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Vector Store**: SQLite-based embeddings storage
- **LLM**: OpenAI GPT-4o-mini
- **PDF Parsing**: pdf-parse

### Data Model

- **Document**: Stores document metadata (id, filename, uploadedAt)
- **Page**: Stores page-level text extraction (docId, pageNumber, text)
- **Chunk**: Stores text chunks with embeddings for retrieval (docId, pageNumber, chunkId, text, embedding)
- **Conversation**: Stores chat history (docId, level, messages)

### Key Components

1. **PDF Processing** (`lib/pdf.ts`): Extracts text from PDFs with page-level tracking
2. **Chunking** (`lib/chunking.ts`): Splits text into ~800-1200 token chunks with overlap
3. **Embeddings** (`lib/embeddings.ts`): Generates embeddings using OpenAI's text-embedding-3-small
4. **Retrieval** (`lib/models.ts`): Cosine similarity search for relevant chunks
5. **LLM Integration** (`lib/llm.ts`): Generates summaries and answers with citations
6. **Database** (`lib/db.ts`): SQLite database with schema initialization

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd insurance-interpreter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

Optional environment variables:
- `MOCK_OPENAI`: Set to `'true'` to use mock embeddings and summaries (saves API costs). Q&A will still use real OpenAI API for dynamic questions.
- `DATABASE_PATH`: Path to SQLite database (default: `./data/insurance.db`)
- `UPLOAD_DIR`: Directory for uploaded PDFs (default: `./uploads`)
- `MAX_FILE_SIZE`: Max file size in bytes (default: 10485760 = 10MB)

4. Create necessary directories:
```bash
mkdir -p data uploads
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Document**: On the landing page, upload your insurance plan PDF
2. **Select Level**: Choose Beginner, Intermediate, or Advanced explanation level
3. **View Summary**: See a personalized plan summary in the Summary tab
4. **Ask Questions**: Use the Ask Questions tab to chat about your plan
   - Click example questions or type your own
   - Answers include citations with page numbers and snippets
   - Confidence levels indicate answer reliability

## API Routes

### POST `/api/upload`
Uploads and processes a PDF file.

**Request**: FormData with `file` field
**Response**: `{ docId, filename, pages, chunks }`

### POST `/api/summary`
Generates a plan summary for a document.

**Request**: `{ docId, level }`
**Response**: `{ summary }`

### POST `/api/chat`
Answers a question about the plan.

**Request**: `{ docId, question, level, conversationHistory? }`
**Response**: `{ answer, citations, confidence }`

### GET `/api/conversation?docId=...`
Retrieves conversation history for a document.

**Response**: `{ conversation }`

### DELETE `/api/delete`
Deletes a document and all associated data.

**Request**: `{ docId }`
**Response**: `{ success: true }`

## Testing

Run tests with:
```bash
npm test
```

Test coverage includes:
- PDF parsing and chunking
- Retrieval functionality
- Refusal behavior when information is missing

## Reliability Features

1. **Citation Requirements**: All answers must cite page numbers and snippets
2. **Refusal Behavior**: Explicitly states when information isn't in the document
3. **Confidence Scoring**: Indicates High/Medium/Low confidence based on retrieval quality
4. **No Hallucination**: System prompts enforce grounding in document content only
5. **Validation**: File type and size validation on upload

## Privacy & Security

- Documents are stored locally (or can be configured for S3-compatible storage)
- No third-party analytics logging of PDFs or extracted text
- Users can delete their documents at any time
- File validation prevents malicious uploads
- Rate limiting recommended for production (not implemented in MVP)

## Production Considerations

### Storage
- MVP uses local disk storage
- For production, configure S3-compatible storage:
  - Update upload route to use S3 SDK
  - Update delete route to remove from S3
  - Consider presigned URLs for file access

### Database
- SQLite works for MVP and small-scale deployments
- For production at scale, consider PostgreSQL with pgvector extension

### Rate Limiting
- Add rate limiting middleware (e.g., `@upstash/ratelimit`)
- Limit uploads per user/IP
- Limit API calls per user/IP

### PDF Parsing
- Current implementation uses approximate page splitting
- For better accuracy, consider `pdfjs-dist` for true page-level extraction

### Error Handling
- Add comprehensive error logging
- Implement retry logic for OpenAI API calls
- Add monitoring and alerting

## Limitations

- PDF parsing is approximate (doesn't use true page-level extraction)
- SQLite vector search is basic (consider pgvector for production)
- No user authentication (add for multi-user support)
- No file encryption at rest (add for sensitive data)

## License

See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
