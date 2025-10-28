-- ============================================================================
-- INSTANT BREAK SYSTEM MIGRATION
-- ============================================================================
-- This migration converts the approval-based break system to instant breaks
-- with 3 simple types: coffee, wc, and lunch
-- ============================================================================

-- Add new break types for instant breaks
ALTER TYPE public.break_type_enum DROP IF EXISTS;
CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');

-- Modify breaks table to use the new enum type
-- First, drop the constraint if it exists and add the new type column
DO $$ 
BEGIN
  -- Add a temporary column with the new type
  ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS type_new public.break_type_enum;
  
  -- Migrate existing data
  UPDATE public.breaks 
  SET type_new = CASE 
    WHEN type = 'lunch' THEN 'lunch'::public.break_type_enum
    WHEN type = 'bathroom' THEN 'wc'::public.break_type_enum
    WHEN type = 'scheduled' THEN 'coffee'::public.break_type_enum
    ELSE 'coffee'::public.break_type_enum
  END
  WHERE type_new IS NULL;
  
  -- Drop old column and rename new one
  ALTER TABLE public.breaks DROP COLUMN IF EXISTS type CASCADE;
  ALTER TABLE public.breaks RENAME COLUMN type_new TO type;
  ALTER TABLE public.breaks ALTER COLUMN type SET NOT NULL;
  
EXCEPTION 
  WHEN undefined_column THEN
    -- If type column doesn't exist as text, it might already be the enum
    NULL;
END $$;

-- Simplify break status - we only need 'active' and 'completed' now
-- No more pending/approved/denied since breaks are instant
DO $$
BEGIN
  -- Update any pending/approved breaks to completed (cleanup)
  UPDATE public.breaks 
  SET status = 'completed', 
      ended_at = COALESCE(ended_at, started_at, created_at)
  WHERE status IN ('pending', 'approved', 'denied');
  
  -- Make sure all breaks have proper timestamps
  UPDATE public.breaks
  SET started_at = COALESCE(started_at, created_at)
  WHERE started_at IS NULL AND status IN ('active', 'completed');
  
END $$;

-- Remove approved_by column since we don't need approvals anymore
ALTER TABLE public.breaks DROP COLUMN IF EXISTS approved_by;

-- Add attendance_id to link breaks to attendance records
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_active ON public.breaks(user_id, status) WHERE status = 'active';

-- Update comments
COMMENT ON TABLE public.breaks IS 'Instant break tracking - coffee, wc, lunch breaks start/end immediately without approval';
COMMENT ON COLUMN public.breaks.type IS 'Break type: coffee (coffee break), wc (bathroom), lunch (lunch break)';
COMMENT ON COLUMN public.breaks.status IS 'Break status: active (currently on break) or completed (break ended)';
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break started (set immediately on creation)';
COMMENT ON COLUMN public.breaks.ended_at IS 'Timestamp when break ended (NULL if still active)';
COMMENT ON COLUMN public.breaks.attendance_id IS 'Link to the attendance record this break belongs to';

-- Create or replace function to auto-set started_at on break creation
CREATE OR REPLACE FUNCTION public.set_break_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NULL AND NEW.status = 'active' THEN
    NEW.started_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set started_at
DROP TRIGGER IF EXISTS set_break_started_at_trigger ON public.breaks;
CREATE TRIGGER set_break_started_at_trigger
  BEFORE INSERT ON public.breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_break_started_at();

-- Clean up old break records that are in limbo
DELETE FROM public.breaks 
WHERE status = 'denied' 
  OR (status = 'pending' AND created_at < now() - interval '7 days');

COMMENT ON FUNCTION public.set_break_started_at IS 'Auto-sets started_at timestamp when a new active break is created';
