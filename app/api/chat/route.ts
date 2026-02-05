import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/llm';
import { getEmbedding } from '@/lib/embeddings';
import { chunkModel, conversationModel, documentModel } from '@/lib/models';
import { ExplanationLevel, ConversationMessage } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { docId, question, level, conversationHistory = [] } = await request.json();

    if (!docId || !question || !level) {
      return NextResponse.json(
        { error: 'docId, question, and level are required' },
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

    // Get query embedding
    const queryEmbedding = await getEmbedding(question);

    // Retrieve similar chunks
    const similarChunks = chunkModel.searchSimilar(docId, queryEmbedding, 5);

    // Format retrieval results
    const retrievalResults = similarChunks.map(chunk => ({
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      snippet: chunk.text.substring(0, 300), // First 300 chars as snippet
    }));

    // Format conversation history
    const history = conversationHistory.map((msg: ConversationMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Generate answer
    const { answer, citations, confidence } = await answerQuestion(
      question,
      retrievalResults,
      level as ExplanationLevel,
      history
    );

    // Get or create conversation
    let conversation = conversationModel.getByDocId(docId);
    const userMessage: ConversationMessage = {
      role: 'user',
      content: question,
    };
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: answer,
      citations,
      confidence,
    };

    const messages: ConversationMessage[] = conversation
      ? [...conversation.messages, userMessage, assistantMessage]
      : [userMessage, assistantMessage];

    if (conversation) {
      conversationModel.update(conversation.id, messages);
    } else {
      conversationModel.create(docId, level as ExplanationLevel, messages);
    }

    return NextResponse.json({
      answer,
      citations,
      confidence,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process question' },
      { status: 500 }
    );
  }
}
