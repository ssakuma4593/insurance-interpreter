import db from './db';

export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Document {
  id: string;
  filename: string;
  uploadedAt: number;
}

export interface Page {
  id: number;
  docId: string;
  pageNumber: number;
  text: string;
}

export interface Chunk {
  id: number;
  docId: string;
  pageNumber: number;
  chunkId: string;
  text: string;
  embedding: number[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  confidence?: 'high' | 'medium' | 'low';
}

export interface Citation {
  pageNumber: number;
  snippet: string;
}

export interface Conversation {
  id: number;
  docId: string;
  level: ExplanationLevel;
  messages: ConversationMessage[];
  createdAt: number;
}

// Document operations
export const documentModel = {
  create: (id: string, filename: string): Document => {
    const stmt = db.prepare('INSERT INTO documents (id, filename, uploadedAt) VALUES (?, ?, ?)');
    const uploadedAt = Date.now();
    stmt.run(id, filename, uploadedAt);
    return { id, filename, uploadedAt };
  },

  getById: (id: string): Document | null => {
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? { id: row.id, filename: row.filename, uploadedAt: row.uploadedAt } : null;
  },

  delete: (id: string): void => {
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
    stmt.run(id);
  },
};

// Page operations
export const pageModel = {
  create: (docId: string, pageNumber: number, text: string): Page => {
    const stmt = db.prepare('INSERT INTO pages (docId, pageNumber, text) VALUES (?, ?, ?)');
    const result = stmt.run(docId, pageNumber, text);
    return {
      id: Number(result.lastInsertRowid),
      docId,
      pageNumber,
      text,
    };
  },

  getByDocId: (docId: string): Page[] => {
    const stmt = db.prepare('SELECT * FROM pages WHERE docId = ? ORDER BY pageNumber');
    const rows = stmt.all(docId) as any[];
    return rows.map(row => ({
      id: row.id,
      docId: row.docId,
      pageNumber: row.pageNumber,
      text: row.text,
    }));
  },
};

// Chunk operations
export const chunkModel = {
  create: (docId: string, pageNumber: number, chunkId: string, text: string, embedding: number[]): Chunk => {
    const stmt = db.prepare('INSERT INTO chunks (docId, pageNumber, chunkId, text, embedding) VALUES (?, ?, ?, ?, ?)');
    const embeddingJson = JSON.stringify(embedding);
    const result = stmt.run(docId, pageNumber, chunkId, text, embeddingJson);
    return {
      id: Number(result.lastInsertRowid),
      docId,
      pageNumber,
      chunkId,
      text,
      embedding,
    };
  },

  getByDocId: (docId: string): Chunk[] => {
    const stmt = db.prepare('SELECT * FROM chunks WHERE docId = ?');
    const rows = stmt.all(docId) as any[];
    return rows.map(row => ({
      id: row.id,
      docId: row.docId,
      pageNumber: row.pageNumber,
      chunkId: row.chunkId,
      text: row.text,
      embedding: JSON.parse(row.embedding),
    }));
  },

  searchSimilar: (docId: string, queryEmbedding: number[], topK: number = 5): Chunk[] => {
    const chunks = chunkModel.getByDocId(docId);
    
    // Calculate cosine similarity
    const similarities = chunks.map(chunk => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      return { chunk, similarity };
    });

    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK).map(item => item.chunk);
  },

  searchByKeywords: (docId: string, query: string, topK: number = 5): Chunk[] => {
    const chunks = chunkModel.getByDocId(docId);
    
    // Normalize query with synonym expansion
    const queryWords = normalizeQuery(query);
    if (queryWords.length === 0) return [];
    
    // Calculate keyword scores for each chunk
    const scoredChunks = chunks.map(chunk => {
      const chunkText = chunk.text.toLowerCase();
      let score = 0;
      
      // Score each word (including synonyms)
      for (const word of queryWords) {
        // Exact word match (with word boundaries) - highest weight
        const exactMatches = (chunkText.match(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')) || []).length;
        score += exactMatches * 3; // Increased weight
        
        // Partial matches (substring) - lower weight
        const partialMatches = (chunkText.match(new RegExp(escapeRegex(word), 'gi')) || []).length;
        score += (partialMatches - exactMatches) * 1;
      }
      
      // Phrase matching - check for original query phrases
      const originalWords = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      for (let i = 0; i < originalWords.length - 1; i++) {
        const phrase = `${originalWords[i]} ${originalWords[i + 1]}`;
        if (chunkText.includes(phrase)) {
          score += 5; // Phrase match bonus
        }
      }
      
      // Full query phrase match (highest bonus)
      const fullQueryPhrase = originalWords.join(' ');
      if (fullQueryPhrase.length > 5 && chunkText.includes(fullQueryPhrase)) {
        score += 10;
      }
      
      return { chunk, score };
    });
    
    // Sort by score and return top K
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK).map(item => item.chunk);
  },

  searchHybrid: (
    docId: string,
    queryEmbedding: number[],
    query: string,
    topK: number = 10,
    semanticWeight: number = 0.5
  ): Chunk[] => {
    const chunks = chunkModel.getByDocId(docId);
    if (chunks.length === 0) return [];
    
    const keywordWeight = 1 - semanticWeight;
    
    // Get semantic scores
    const semanticScores = chunks.map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));
    
    // Normalize semantic scores to [0, 1]
    const maxSemantic = Math.max(...semanticScores.map(s => s.score), 0.001);
    const normalizedSemantic = semanticScores.map(s => ({
      chunk: s.chunk,
      semanticScore: s.score / maxSemantic,
    }));
    
    // Get keyword scores with expanded query
    const queryWords = normalizeQuery(query);
    const keywordScores = chunks.map(chunk => {
      if (queryWords.length === 0) return { chunk, keywordScore: 0 };
      
      const chunkText = chunk.text.toLowerCase();
      let score = 0;
      
      // Score each word (including synonyms)
      for (const word of queryWords) {
        // Exact word match (with word boundaries) - highest weight
        const exactMatches = (chunkText.match(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi')) || []).length;
        score += exactMatches * 3; // Increased weight
        
        // Partial matches (substring) - lower weight
        const partialMatches = (chunkText.match(new RegExp(escapeRegex(word), 'gi')) || []).length;
        score += (partialMatches - exactMatches) * 1;
      }
      
      // Phrase matching - check for original query phrases
      const originalWords = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      for (let i = 0; i < originalWords.length - 1; i++) {
        const phrase = `${originalWords[i]} ${originalWords[i + 1]}`;
        if (chunkText.includes(phrase)) {
          score += 5; // Phrase match bonus
        }
      }
      
      // Full query phrase match (highest bonus)
      const fullQueryPhrase = originalWords.join(' ');
      if (fullQueryPhrase.length > 5 && chunkText.includes(fullQueryPhrase)) {
        score += 10;
      }
      
      return { chunk, keywordScore: score };
    });
    
    // Normalize keyword scores to [0, 1]
    const maxKeyword = Math.max(...keywordScores.map(s => s.keywordScore), 0.001);
    const normalizedKeyword = keywordScores.map(s => ({
      chunk: s.chunk,
      keywordScore: s.keywordScore / maxKeyword,
    }));
    
    // Combine scores - but boost keyword-heavy results
    const combined = normalizedSemantic.map(sem => {
      const keyword = normalizedKeyword.find(k => k.chunk.id === sem.chunk.id);
      const keywordScore = keyword?.keywordScore || 0;
      
      // If keyword score is high, give it more weight
      const adjustedKeywordWeight = keywordScore > 0.5 ? keywordWeight * 1.5 : keywordWeight;
      const adjustedSemanticWeight = keywordScore > 0.5 ? semanticWeight * 0.7 : semanticWeight;
      const totalWeight = adjustedKeywordWeight + adjustedSemanticWeight;
      
      const finalScore = 
        (adjustedSemanticWeight * sem.semanticScore + adjustedKeywordWeight * keywordScore) / totalWeight;
      
      return { chunk: sem.chunk, score: finalScore, keywordScore, semanticScore: sem.semanticScore };
    });
    
    // Sort by combined score and return top K
    combined.sort((a, b) => b.score - a.score);
    
    // Debug logging
    console.log(`[Hybrid Search] Query: "${query}"`);
    console.log(`[Hybrid Search] Expanded words: ${queryWords.join(', ')}`);
    console.log(`[Hybrid Search] Total chunks searched: ${chunks.length}`);
    console.log(`[Hybrid Search] Top 5 results:`);
    combined.slice(0, 5).forEach((result, idx) => {
      const snippet = result.chunk.text.substring(0, 150).replace(/\n/g, ' ');
      console.log(`  ${idx + 1}. Score: ${result.score.toFixed(3)} (sem: ${result.semanticScore.toFixed(3)}, kw: ${result.keywordScore.toFixed(3)})`);
      console.log(`     Page ${result.chunk.pageNumber}: "${snippet}..."`);
    });
    
    return combined.slice(0, topK).map(item => item.chunk);
  },
};

// Conversation operations
export const conversationModel = {
  create: (docId: string, level: ExplanationLevel, messages: ConversationMessage[]): Conversation => {
    const stmt = db.prepare('INSERT INTO conversations (docId, level, messages, createdAt) VALUES (?, ?, ?, ?)');
    const createdAt = Date.now();
    const messagesJson = JSON.stringify(messages);
    const result = stmt.run(docId, level, messagesJson, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      docId,
      level,
      messages,
      createdAt,
    };
  },

  getByDocId: (docId: string): Conversation | null => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE docId = ? ORDER BY createdAt DESC LIMIT 1');
    const row = stmt.get(docId) as any;
    if (!row) return null;
    return {
      id: row.id,
      docId: row.docId,
      level: row.level as ExplanationLevel,
      messages: JSON.parse(row.messages),
      createdAt: row.createdAt,
    };
  },

  update: (id: number, messages: ConversationMessage[]): void => {
    const stmt = db.prepare('UPDATE conversations SET messages = ? WHERE id = ?');
    stmt.run(JSON.stringify(messages), id);
  },
};

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper function to normalize query for keyword search
function normalizeQuery(query: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'my', 'me', 'do', 'does', 'what',
    'how', 'when', 'where', 'why', 'can', 'could', 'should', 'would'
  ]);
  
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2 && !stopWords.has(word)); // Filter short words and stop words
  
  // Expand with synonyms and variations
  const expanded: string[] = [];
  for (const word of words) {
    expanded.push(word);
    
    // Add synonyms and variations
    const synonyms = getSynonyms(word);
    expanded.push(...synonyms);
  }
  
  // Remove duplicates
  return Array.from(new Set(expanded));
}

// Helper function to get synonyms and variations for common insurance terms
function getSynonyms(word: string): string[] {
  const synonymMap: Record<string, string[]> = {
    'preventive': ['preventative', 'prevention', 'prevent'],
    'preventative': ['preventive', 'prevention', 'prevent'],
    'visit': ['visits', 'appointment', 'appointments', 'care', 'service', 'services'],
    'visits': ['visit', 'appointment', 'appointments', 'care', 'service', 'services'],
    'primary': ['primary', 'general', 'family'],
    'care': ['service', 'services', 'visit', 'visits', 'treatment'],
    'covered': ['cover', 'coverage', 'includes', 'include', 'provided'],
    'coverage': ['cover', 'covered', 'includes', 'include'],
    'copay': ['copayment', 'co-pay', 'co-payment'],
    'deductible': ['deductibles'],
    'specialist': ['specialists', 'specialty'],
  };
  
  return synonymMap[word] || [];
}

// Helper function to escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
