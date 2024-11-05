-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create encryption keys table
CREATE TABLE IF NOT EXISTS public.encryption_keys (
    version INTEGER PRIMARY KEY,
    salt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    retired_at TIMESTAMPTZ
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL,
    invalidated_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'ERROR')) NOT NULL,
    encryption_version INTEGER REFERENCES encryption_keys(version),
    timestamp TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- Add indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id, last_activity);
CREATE INDEX idx_sessions_activity ON user_sessions(last_activity) 
WHERE invalidated_at IS NULL;
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation, timestamp);

-- Enable RLS
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Only admins can manage encryption keys" ON encryption_keys
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE role = 'admin'
    ));

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE role = 'admin'
    ));

CREATE POLICY "Audit logs viewable by admins" ON audit_logs
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE role = 'admin'
    ));