import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'insurance.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    uploadedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docId TEXT NOT NULL,
    pageNumber INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (docId) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docId TEXT NOT NULL,
    pageNumber INTEGER NOT NULL,
    chunkId TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    FOREIGN KEY (docId) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docId TEXT NOT NULL,
    level TEXT NOT NULL,
    messages TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (docId) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_docId ON chunks(docId);
  CREATE INDEX IF NOT EXISTS idx_pages_docId ON pages(docId);
`);

export default db;
