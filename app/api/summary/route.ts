import { NextRequest, NextResponse } from 'next/server';
import { generatePlanSummary } from '@/lib/llm';
import { pageModel, documentModel } from '@/lib/models';
import { ExplanationLevel } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { docId, level } = await request.json();

    if (!docId || !level) {
      return NextResponse.json(
        { error: 'docId and level are required' },
        { status: 400 }
      );
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be beginner, intermediate, or advanced' },
        { status: 400 }
      );
    }

    // Verify document exists
    const doc = documentModel.getById(docId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get all pages
    const pages = pageModel.getByDocId(docId);
    const fullText = pages.map(p => `Page ${p.pageNumber}:\n${p.text}`).join('\n\n');

    // Generate summary
    const summary = await generatePlanSummary(fullText, level as ExplanationLevel);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
