-- Update all existing breaks with 'micro' type to 'coffee'
-- This fixes the enum mismatch error when trying to end old breaks

-- First, temporarily allow the old 'micro' value in the enum if needed
DO $$ 
BEGIN
  -- Update all 'micro' breaks to 'coffee'
  UPDATE breaks 
  SET type = 'coffee'::break_type_enum 
  WHERE type::text = 'micro';
  
  RAISE NOTICE 'Updated % breaks from micro to coffee', (SELECT COUNT(*) FROM breaks WHERE type::text = 'micro');
EXCEPTION
  WHEN OTHERS THEN
    -- If the above fails, it means 'micro' is no longer in the enum
    -- We need to add it temporarily, update the data, then remove it
    
    -- Add 'micro' to enum temporarily
    ALTER TYPE break_type_enum ADD VALUE IF NOT EXISTS 'micro';
    
    -- Update all 'micro' breaks to 'coffee'
    UPDATE breaks 
    SET type = 'coffee'::break_type_enum 
    WHERE type::text = 'micro';
    
    RAISE NOTICE 'Added micro temporarily, updated breaks, total updated: %', (SELECT COUNT(*) FROM breaks WHERE type = 'coffee');
END $$;

-- Create a comment on the breaks table for documentation
COMMENT ON TABLE breaks IS 'Break records - valid types are: coffee, wc, lunch, emergency';