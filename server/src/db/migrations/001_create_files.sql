-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Files metadata table
CREATE TABLE IF NOT EXISTS files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name TEXT NOT NULL,
  s3_key       TEXT NOT NULL UNIQUE,
  s3_url       TEXT NOT NULL,
  mime_type    TEXT,
  size         BIGINT DEFAULT 0,
  category     TEXT DEFAULT 'Others',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
