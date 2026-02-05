import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parsePDF } from '@/lib/pdf';
import { chunkText } from '@/lib/chunking';
import { getEmbeddings } from '@/lib/embeddings';
import { documentModel, pageModel, chunkModel } from '@/lib/models';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique document ID
    const docId = uuidv4();
    const filename = file.name;
    const filePath = path.join(UPLOAD_DIR, `${docId}.pdf`);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Parse PDF
    const pages = await parsePDF(filePath);

    // Store document
    documentModel.create(docId, filename);

    // Store pages
    for (const page of pages) {
      pageModel.create(docId, page.pageNumber, page.text);
    }

    // Chunk and embed
    const allChunks: Array<{ text: string; pageNumber: number; chunkId: string }> = [];
    for (const page of pages) {
      const chunks = chunkText(page.text, page.pageNumber);
      allChunks.push(...chunks);
    }

    // Get embeddings in batches
    const batchSize = 100;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.text);
      const embeddings = await getEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        chunkModel.create(
          docId,
          batch[j].pageNumber,
          batch[j].chunkId,
          batch[j].text,
          embeddings[j]
        );
      }
    }

    return NextResponse.json({
      docId,
      filename,
      pages: pages.length,
      chunks: allChunks.length,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process upload' },
      { status: 500 }
    );
  }
}
