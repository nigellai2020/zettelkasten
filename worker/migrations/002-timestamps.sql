-- Migration: Convert created_at and updated_at to Unix timestamps (ms)

-- 1. Add new columns for unix timestamps
ALTER TABLE notes ADD COLUMN created_at_unix INTEGER;
ALTER TABLE notes ADD COLUMN updated_at_unix INTEGER;

-- 2. Convert ISO8601 or DATETIME to unix timestamp (ms)
UPDATE notes
SET
  created_at_unix = (strftime('%s', created_at) * 1000) + (substr(created_at, 21, 3)),
  updated_at_unix = (strftime('%s', updated_at) * 1000) + (substr(updated_at, 21, 3));

-- 3. Create new table with correct schema
CREATE TABLE notes_new (
  id CHAR(36) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  links JSON
);

-- 4. Copy data
INSERT INTO notes_new (id, title, content, tags, created_at, updated_at, links)
SELECT id, title, content, tags, created_at_unix, updated_at_unix, links FROM notes;

-- 5. Drop old table and rename
DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;

-- 6. (Optional) Recreate indexes if needed
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_links ON notes(links);
