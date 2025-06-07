-- Create devices table with all columns
CREATE TABLE IF NOT EXISTS devices (
  device_id SERIAL PRIMARY KEY,
  id VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) NOT NULL,
  friendly_id VARCHAR(10) NOT NULL,
  firmware_version VARCHAR(100),
  width INTEGER,
  height INTEGER,
  refresh_rate INTEGER,
  battery_voltage DOUBLE PRECISION,
  rssi INTEGER,
  filename VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_devices_id UNIQUE (id),
  CONSTRAINT uk_access_token UNIQUE (access_token),
  CONSTRAINT uk_friendly_id UNIQUE (friendly_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_access_token ON devices(access_token);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at);
CREATE INDEX IF NOT EXISTS idx_devices_friendly_id ON devices(friendly_id) WHERE friendly_id IS NOT NULL;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
