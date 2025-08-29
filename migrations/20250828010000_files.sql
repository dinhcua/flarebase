-- Create files table for file storage metadata
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES system_users(id)
);

-- Index for querying files by user
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- Index for querying public files
CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public);