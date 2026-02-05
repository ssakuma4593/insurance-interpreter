import { NextRequest, NextResponse } from 'next/server';
import { conversationModel } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    const conversation = conversationModel.getByDocId(docId);

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get conversation' },
      { status: 500 }
    );
  }
}
