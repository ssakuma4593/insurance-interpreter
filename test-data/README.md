# Test Data

This directory contains test PDF files and mock responses for development and QA.

## Files

- `Summary-of-Medical-Benefits.pdf` - Sample insurance plan document for testing
- `mock-responses.json` - Template summaries for mock mode (used when `MOCK_OPENAI=true`)

## Mock Mode

When `MOCK_OPENAI=true` is set in your `.env` file:

- **Embeddings**: Generated deterministically from text hash (no API calls)
- **Plan Summary**: Uses template responses from `mock-responses.json`
- **Q&A**: Still uses real OpenAI API for dynamic questions

This saves API costs during development while still allowing you to test the full application flow.

## Usage

1. Set `MOCK_OPENAI=true` in your `.env` file
2. Upload a PDF (embeddings will be mocked)
3. Generate summary (uses template)
4. Ask questions (uses real API)

## Note

This directory is gitignored to avoid committing large PDF files. Add your test PDFs here for local development.
