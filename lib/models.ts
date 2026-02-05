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
