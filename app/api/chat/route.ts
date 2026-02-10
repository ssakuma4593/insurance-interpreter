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

    // Use hybrid search: combines semantic (embedding) + keyword search
    // Increased topK to 15 and adjusted semantic weight to 0.5 (equal weight with keywords)
    let similarChunks = chunkModel.searchHybrid(docId, queryEmbedding, question, 15, 0.5);
    
    // Fallback: If we got very few results or they seem irrelevant, try pure keyword search
    if (similarChunks.length < 5) {
      console.log('[Chat] Hybrid search returned few results, trying keyword-only search');
      const keywordChunks = chunkModel.searchByKeywords(docId, question, 15);
      // Merge and deduplicate by chunk ID
      const chunkMap = new Map();
      similarChunks.forEach(chunk => chunkMap.set(chunk.id, chunk));
      keywordChunks.forEach(chunk => chunkMap.set(chunk.id, chunk));
      similarChunks = Array.from(chunkMap.values()).slice(0, 15);
    }

    // Format retrieval results - send full chunk text, not just snippets
    const retrievalResults = similarChunks.map(chunk => ({
      text: chunk.text, // Full chunk text for better context
      pageNumber: chunk.pageNumber,
      snippet: chunk.text.substring(0, 800), // Longer snippet for display
    }));
    
    // Debug logging
    console.log(`\n[Chat API] ========================================`);
    console.log(`[Chat API] Question: "${question}"`);
    console.log(`[Chat API] Retrieved ${retrievalResults.length} chunks`);
    retrievalResults.forEach((result, idx) => {
      const preview = result.text.substring(0, 200).replace(/\n/g, ' ');
      console.log(`[Chat API] Chunk ${idx + 1} (Page ${result.pageNumber}): "${preview}..."`);
      // Check if chunk contains preventive/preventative keywords
      const lowerText = result.text.toLowerCase();
      if (lowerText.includes('prevent') || lowerText.includes('primary') || lowerText.includes('care')) {
        console.log(`[Chat API]   ✓ Contains preventive/primary care keywords!`);
      }
    });
    console.log(`[Chat API] ========================================\n`);

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
