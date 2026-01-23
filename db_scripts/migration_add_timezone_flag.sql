-- Migration: Add manual timezone flag
-- Run this in Supabase SQL Editor

-- Add column to track if user manually set their timezone
-- If TRUE: Currency changes will NOT update timezone
-- If FALSE (Default): Currency changes WILL auto-update timezone
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS timezone_set_manually BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN workspaces.timezone_set_manually IS 'True if user manually overrode the timezone; prevents auto-update on currency change';
