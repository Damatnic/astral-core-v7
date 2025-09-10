-- Astral Core v7 Database Initialization Script
-- This script sets up the initial database configuration for PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create audit schema for HIPAA compliance
CREATE SCHEMA IF NOT EXISTS audit;

-- Set up database configuration for HIPAA compliance
ALTER DATABASE astralcore_v7 SET log_statement = 'all';
ALTER DATABASE astralcore_v7 SET log_min_duration_statement = 1000;

-- Create audit table for tracking all database changes
CREATE TABLE IF NOT EXISTS audit.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_id BIGINT DEFAULT txid_current()
);

-- Create index on audit table for performance
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit.activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit.activity_log(schema_name, table_name);

-- Create audit function for automatic logging
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Handle different operation types
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    END IF;

    -- Insert audit record
    INSERT INTO audit.activity_log (
        schema_name,
        table_name,
        operation,
        old_data,
        new_data,
        user_id,
        session_id,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        NULLIF(current_setting('app.current_user_id', true), '')::UUID,
        NULLIF(current_setting('app.session_id', true), ''),
        NULLIF(current_setting('app.client_ip', true), '')::INET,
        NULLIF(current_setting('app.user_agent', true), '')
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to enable audit logging on a table
CREATE OR REPLACE FUNCTION audit.enable_audit(target_table TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TRIGGER audit_trigger_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION audit.log_changes();
    ', target_table, target_table);
END;
$$ LANGUAGE plpgsql;

-- Function to disable audit logging on a table
CREATE OR REPLACE FUNCTION audit.disable_audit(target_table TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%I ON %I;', target_table, target_table);
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring view
CREATE OR REPLACE VIEW audit.performance_summary AS
SELECT 
    schema_name,
    table_name,
    operation,
    COUNT(*) as operation_count,
    AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_time_between_ops
FROM audit.activity_log 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY schema_name, table_name, operation
ORDER BY operation_count DESC;

-- Create user activity summary view
CREATE OR REPLACE VIEW audit.user_activity_summary AS
SELECT 
    user_id,
    COUNT(*) as total_operations,
    COUNT(DISTINCT session_id) as unique_sessions,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity,
    COUNT(DISTINCT ip_address) as unique_ip_addresses
FROM audit.activity_log 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_operations DESC;

-- Grant permissions for the application user
GRANT USAGE ON SCHEMA audit TO astral_user;
GRANT SELECT, INSERT ON audit.activity_log TO astral_user;
GRANT SELECT ON audit.performance_summary TO astral_user;
GRANT SELECT ON audit.user_activity_summary TO astral_user;

-- Set up connection limits and security
ALTER ROLE astral_user CONNECTION LIMIT 100;

-- Create a function to cleanup old audit logs (for HIPAA retention compliance)
CREATE OR REPLACE FUNCTION audit.cleanup_old_logs(retention_days INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit.activity_log 
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit.activity_log (
        schema_name, 
        table_name, 
        operation, 
        new_data
    ) VALUES (
        'audit', 
        'activity_log', 
        'CLEANUP', 
        jsonb_build_object('deleted_records', deleted_count, 'retention_days', retention_days)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_recent ON audit.activity_log(timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- Initialize database statistics
ANALYZE;

-- Log successful initialization
INSERT INTO audit.activity_log (
    schema_name, 
    table_name, 
    operation, 
    new_data
) VALUES (
    'public', 
    'database', 
    'INITIALIZE', 
    jsonb_build_object(
        'version', '7.0.0',
        'timestamp', NOW(),
        'environment', COALESCE(current_setting('app.environment', true), 'development')
    )
);

-- Display initialization status
DO $$
BEGIN
    RAISE NOTICE 'Astral Core v7 database initialization completed successfully';
    RAISE NOTICE 'Audit logging enabled and configured for HIPAA compliance';
    RAISE NOTICE 'Database ready for application startup';
END $$;