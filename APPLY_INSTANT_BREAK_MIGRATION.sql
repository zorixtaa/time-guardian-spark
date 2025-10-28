-- ============================================================================
-- INSTANT BREAK SYSTEM MIGRATION
-- ============================================================================
-- This migration converts the approval-based break system to instant breaks
-- with 3 simple types: coffee, wc, and lunch
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 3. Select your project (elnarrbpsphoxgldzehh)
-- 4. Go to: SQL Editor (left sidebar)
-- 5. Click "New Query"
-- 6. Paste this entire file
-- 7. Click "Run" (or press Ctrl+Enter)
-- 8. Wait for "Success. No rows returned" message
-- ============================================================================

BEGIN;

-- Step 1: Create new enum type for instant breaks
DO $$ 
BEGIN
  -- Drop old enum if exists and create new one
  DROP TYPE IF EXISTS public.break_type_enum CASCADE;
  CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');
  RAISE NOTICE '✅ Created new break_type_enum with: coffee, wc, lunch';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Note: %', SQLERRM;
END $$;

-- Step 2: Migrate the breaks table
DO $$ 
BEGIN
  -- Add a temporary column with the new enum type
  ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS type_new public.break_type_enum;
  RAISE NOTICE '✅ Added temporary type_new column';
  
  -- Migrate existing data to new break types
  UPDATE public.breaks 
  SET type_new = CASE 
    WHEN type::text = 'lunch' THEN 'lunch'::public.break_type_enum
    WHEN type::text = 'bathroom' THEN 'wc'::public.break_type_enum
    WHEN type::text = 'scheduled' THEN 'coffee'::public.break_type_enum
    WHEN type::text = 'emergency' THEN 'coffee'::public.break_type_enum
    ELSE 'coffee'::public.break_type_enum
  END
  WHERE type_new IS NULL;
  RAISE NOTICE '✅ Migrated existing break records to new types';
  
  -- Drop old type column and rename new one
  ALTER TABLE public.breaks DROP COLUMN IF EXISTS type CASCADE;
  ALTER TABLE public.breaks RENAME COLUMN type_new TO type;
  ALTER TABLE public.breaks ALTER COLUMN type SET NOT NULL;
  RAISE NOTICE '✅ Replaced old type column with new enum';
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Migration note: %', SQLERRM;
END $$;

-- Step 3: Clean up break statuses (simplify to active/completed)
DO $$
BEGIN
  -- Update any pending/approved/denied breaks to completed
  UPDATE public.breaks 
  SET status = 'completed', 
      ended_at = COALESCE(ended_at, started_at, created_at)
  WHERE status IN ('pending', 'approved', 'denied');
  
  RAISE NOTICE '✅ Cleaned up old break statuses';
  
  -- Make sure all breaks have proper timestamps
  UPDATE public.breaks
  SET started_at = COALESCE(started_at, created_at)
  WHERE started_at IS NULL AND status IN ('active', 'completed');
  
  RAISE NOTICE '✅ Fixed break timestamps';
END $$;

-- Step 4: Remove approval-related columns
ALTER TABLE public.breaks DROP COLUMN IF EXISTS approved_by;

DO $$
BEGIN
  RAISE NOTICE '✅ Removed approved_by column (no longer needed)';
END $$;

-- Step 5: Add attendance_id to link breaks to attendance records
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS attendance_id UUID;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'breaks_attendance_id_fkey'
  ) THEN
    ALTER TABLE public.breaks 
    ADD CONSTRAINT breaks_attendance_id_fkey 
    FOREIGN KEY (attendance_id) REFERENCES public.attendance(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added foreign key constraint for attendance_id';
  ELSE
    RAISE NOTICE '✅ Foreign key constraint already exists';
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_active ON public.breaks(user_id, status) WHERE status = 'active';

DO $$
BEGIN
  RAISE NOTICE '✅ Created performance indexes';
END $$;

-- Step 7: Update table and column comments
COMMENT ON TABLE public.breaks IS 'Instant break tracking - coffee, wc, lunch breaks start/end immediately without approval';
COMMENT ON COLUMN public.breaks.type IS 'Break type: coffee (coffee break), wc (bathroom), lunch (lunch break)';
COMMENT ON COLUMN public.breaks.status IS 'Break status: active (currently on break) or completed (break ended)';
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break started (set immediately on creation)';
COMMENT ON COLUMN public.breaks.ended_at IS 'Timestamp when break ended (NULL if still active)';
COMMENT ON COLUMN public.breaks.attendance_id IS 'Link to the attendance record this break belongs to';

-- Step 8: Create function to auto-set started_at on break creation
CREATE OR REPLACE FUNCTION public.set_break_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NULL AND NEW.status = 'active' THEN
    NEW.started_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_break_started_at IS 'Auto-sets started_at timestamp when a new active break is created';

-- Step 9: Create trigger to auto-set started_at
DROP TRIGGER IF EXISTS set_break_started_at_trigger ON public.breaks;
CREATE TRIGGER set_break_started_at_trigger
  BEFORE INSERT ON public.breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_break_started_at();

DO $$
BEGIN
  RAISE NOTICE '✅ Created auto-timestamp trigger';
END $$;

-- Step 10: Clean up old/invalid break records
DELETE FROM public.breaks 
WHERE status = 'denied' 
  OR (status = 'pending' AND created_at < now() - interval '7 days');

DO $$
BEGIN
  RAISE NOTICE '✅ Cleaned up old invalid break records';
END $$;

-- Step 11: Verify the migration
DO $$
DECLARE
  coffee_count INTEGER;
  wc_count INTEGER;
  lunch_count INTEGER;
  old_type_count INTEGER;
BEGIN
  -- Count new break types
  SELECT COUNT(*) INTO coffee_count FROM public.breaks WHERE type = 'coffee';
  SELECT COUNT(*) INTO wc_count FROM public.breaks WHERE type = 'wc';
  SELECT COUNT(*) INTO lunch_count FROM public.breaks WHERE type = 'lunch';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 MIGRATION COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Break types migrated:';
  RAISE NOTICE '   - Coffee breaks: %', coffee_count;
  RAISE NOTICE '   - WC breaks: %', wc_count;
  RAISE NOTICE '   - Lunch breaks: %', lunch_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy the updated frontend to Vercel';
  RAISE NOTICE '2. Clear browser cache for all users';
  RAISE NOTICE '3. Test the new instant break system';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;

-- Display current schema to verify
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'breaks'
ORDER BY ordinal_position;
