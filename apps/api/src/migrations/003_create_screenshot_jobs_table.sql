-- Create the screenshot_jobs table
CREATE TABLE IF NOT EXISTS screenshot_jobs (
  job_id SERIAL PRIMARY KEY,
  id UUID NOT NULL UNIQUE,
  device_profile JSONB NOT NULL,
  color_scheme JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_screenshot_jobs_status ON screenshot_jobs(status);
CREATE INDEX IF NOT EXISTS idx_screenshot_jobs_created_at ON screenshot_jobs(created_at);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_screenshot_jobs_updated_at
BEFORE UPDATE ON screenshot_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
