import OpenAI from 'openai';
import { generateMockEmbedding, generateMockEmbeddings } from './mock-embeddings';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const USE_MOCK_EMBEDDINGS = process.env.MOCK_OPENAI === 'true';

export async function getEmbedding(text: string): Promise<number[]> {
  if (USE_MOCK_EMBEDDINGS) {
    console.log('[MOCK] Generating mock embedding for text');
    return generateMockEmbedding(text);
  }
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (USE_MOCK_EMBEDDINGS) {
    console.log(`[MOCK] Generating ${texts.length} mock embeddings`);
    return generateMockEmbeddings(texts);
  }
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  
  return response.data.map(item => item.embedding);
}
