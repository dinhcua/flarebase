-- Create events table for detailed event tracking
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_label TEXT,
    event_value REAL,
    properties TEXT,
    user_id TEXT,
    session_id TEXT,
    timestamp TEXT NOT NULL,
    url TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES system_users(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);