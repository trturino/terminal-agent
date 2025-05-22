-- Recreate the table with all required columns
CREATE TABLE plugins IF NOT EXISTS (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT true,
    s3_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(name, version)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_plugins_uuid ON plugins(uuid);
CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
