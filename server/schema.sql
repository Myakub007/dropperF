-- Day 6 schema: users, files, file_versions
-- Run with: psql -U <youruser> -d <yourdb> -f schema.sql
-- (or paste into pgAdmin's Query Tool and execute)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A "file" is the logical identity: a path owned by a user.
-- It does NOT hold chunk data itself -- that lives in file_versions.
CREATE TABLE IF NOT EXISTS files (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,          -- e.g. '/projects/q3/report.docx'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevents the same user from having two Files rows at the same path.
  -- Your POST /files route should check-then-add-a-version instead of
  -- relying on this to fire in normal operation -- this is a safety net,
  -- not the primary mechanism.
  UNIQUE (user_id, path)
);

-- Each row is one version of one file. New edits = new rows here,
-- nothing gets overwritten -- this is what gives you version history
-- and is the foundation for conflict handling in Week 2.
CREATE TABLE IF NOT EXISTS file_versions (
  id            SERIAL PRIMARY KEY,
  file_id       INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  hash_array    TEXT[] NOT NULL,        -- ordered chunk hashes, same array
                                         -- chunkAndStoreFile()/reassembleFile() use
  size_bytes    BIGINT,                 -- optional, sum of chunk sizes
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up "give me all versions of this file, newest first"
-- (exactly the query GET /files/:id will run to find the latest version).
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id_created_at
  ON file_versions (file_id, created_at DESC);

-- Speeds up "does this user already have a file at this path"
-- (already covered by the UNIQUE constraint above, which creates an
-- index automatically -- listed here just as a note, no action needed).