import { chunkText } from '@/lib/chunking';

describe('chunkText', () => {
  it('should chunk text into multiple chunks', () => {
    const longText = 'A'.repeat(5000); // ~5000 chars
    const chunks = chunkText(longText, 1);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].chunkId).toContain('1-');
  });

  it('should preserve page number', () => {
    const text = 'Sample text content';
    const chunks = chunkText(text, 5);
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].pageNumber).toBe(5);
  });

  it('should handle empty text', () => {
    const chunks = chunkText('', 1);
    expect(chunks.length).toBe(0);
  });

  it('should handle short text', () => {
    const text = 'Short text';
    const chunks = chunkText(text, 1);
    
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(text);
  });
});
