-- +goose Up
-- +goose StatementBegin
CREATE TABLE plugins (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_plugins_uuid ON plugins(uuid);
CREATE INDEX idx_plugins_name ON plugins(name);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_plugins_name;
DROP INDEX IF EXISTS idx_plugins_uuid;
DROP TABLE IF EXISTS plugins;
-- +goose StatementEnd
