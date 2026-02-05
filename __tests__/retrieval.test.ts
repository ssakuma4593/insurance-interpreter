import { chunkModel } from '@/lib/models';
import db from '@/lib/db';

// Mock the database for testing
jest.mock('@/lib/db', () => {
  const mockDb = {
    prepare: jest.fn(),
    exec: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockDb,
  };
});

describe('Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no chunks found', () => {
    const mockStmt = {
      all: jest.fn().mockReturnValue([]),
    };
    (db.prepare as jest.Mock).mockReturnValue(mockStmt);

    const chunks = chunkModel.getByDocId('test-doc');
    expect(chunks).toEqual([]);
  });

  it('should parse embeddings correctly', () => {
    const mockChunks = [
      {
        id: 1,
        docId: 'test-doc',
        pageNumber: 1,
        chunkId: '1-0',
        text: 'Sample text',
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
      },
    ];
    const mockStmt = {
      all: jest.fn().mockReturnValue(mockChunks),
    };
    (db.prepare as jest.Mock).mockReturnValue(mockStmt);

    const chunks = chunkModel.getByDocId('test-doc');
    expect(chunks[0].embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
