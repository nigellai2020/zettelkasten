-- Migration: Add 'deleted' field to notes table for soft deletes

ALTER TABLE notes ADD COLUMN deleted INTEGER DEFAULT 0;

-- (Optional) If you want to backfill or index deleted notes:
CREATE INDEX idx_notes_deleted ON notes(deleted);
