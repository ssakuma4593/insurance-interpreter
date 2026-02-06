import crypto from 'crypto';

/**
 * Generate a deterministic embedding vector from text using hash-based approach
 * Same text will always produce the same embedding (useful for testing)
 */
export function generateMockEmbedding(text: string, dimension: number = 1536): number[] {
  // Create a hash of the text
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  
  // Convert hash to a seed for deterministic random generation
  const seed = parseInt(hash.substring(0, 8), 16);
  
  // Generate deterministic "random" numbers based on seed
  const embedding: number[] = [];
  for (let i = 0; i < dimension; i++) {
    // Use a simple LCG (Linear Congruential Generator) for deterministic randomness
    const value = ((seed + i) * 1103515245 + 12345) % 2147483647;
    // Normalize to [-1, 1] range
    const normalized = (value / 2147483647) * 2 - 1;
    embedding.push(normalized);
  }
  
  // Normalize the vector to unit length (for cosine similarity to work properly)
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

export function generateMockEmbeddings(texts: string[], dimension: number = 1536): number[][] {
  return texts.map(text => generateMockEmbedding(text, dimension));
}
