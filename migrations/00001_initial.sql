-- Create collections table to store table definitions
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    schema TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create system_users table for authentication
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

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
    updated_at TEXT NOT NULL
);

-- Create tracking table for analytics
CREATE TABLE IF NOT EXISTS tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    country TEXT,
    city TEXT,
    user_agent TEXT NOT NULL,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    user_id TEXT,
    timestamp TEXT NOT NULL
);

-- Create events table for detailed analytics
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_label TEXT,
    event_value INTEGER,
    properties TEXT, -- JSON string
    user_id TEXT,
    session_id TEXT,
    timestamp TEXT NOT NULL,
    url TEXT,
    user_agent TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);