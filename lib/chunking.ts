export interface ChunkWithMetadata {
  text: string;
  pageNumber: number;
  chunkId: string;
}

/**
 * Chunk text into ~800-1200 token chunks with ~150-200 token overlap
 * Rough estimate: 1 token ≈ 4 characters
 */
export function chunkText(text: string, pageNumber: number): ChunkWithMetadata[] {
  const chunks: ChunkWithMetadata[] = [];
  
  // Rough token estimation: ~4 chars per token
  const targetChunkSize = 1000 * 4; // ~1000 tokens
  const overlapSize = 175 * 4; // ~175 tokens overlap
  
  let start = 0;
  let chunkIndex = 0;
  
  while (start < text.length) {
    const end = Math.min(start + targetChunkSize, text.length);
    
    // Try to break at sentence boundaries
    let chunkEnd = end;
    if (end < text.length) {
      // Look for sentence endings within the last 200 chars
      const searchStart = Math.max(start, end - 200);
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > searchStart) {
        chunkEnd = breakPoint + 1;
      }
    }
    
    const chunkText = text.slice(start, chunkEnd).trim();
    
    if (chunkText) {
      chunks.push({
        text: chunkText,
        pageNumber,
        chunkId: `${pageNumber}-${chunkIndex}`,
      });
      chunkIndex++;
    }
    
    // Move start forward with overlap
    start = Math.max(start + 1, chunkEnd - overlapSize);
    
    // Safety check to prevent infinite loops
    if (start >= end) {
      start = end;
    }
  }
  
  return chunks;
}
