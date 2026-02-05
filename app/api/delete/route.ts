import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { documentModel } from '@/lib/models';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function DELETE(request: NextRequest) {
  try {
    const { docId } = await request.json();

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    // Delete file
    const filePath = path.join(UPLOAD_DIR, `${docId}.pdf`);
    try {
      await unlink(filePath);
    } catch (error: any) {
      // File might not exist, continue with DB deletion
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Delete from database (cascades to pages, chunks, conversations)
    documentModel.delete(docId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
