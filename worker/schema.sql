CREATE TABLE notes (
  id CHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- Store tags as a space- or comma-separated string
  created_at INTEGER NOT NULL, -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL, -- Unix timestamp (ms)
  links JSON
);

-- Full-text search virtual table (FTS5)
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  content,
  tags
);

-- Normal indexes
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_links ON notes(links);