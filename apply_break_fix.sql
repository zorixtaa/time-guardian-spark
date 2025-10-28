-- ============================================================================
-- FIX: "started_at" NOT NULL constraint error when requesting breaks
-- ============================================================================
-- This script fixes the error:
-- "null value in column "started_at" of relation "breaks" violates not-null constraint"
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and click "Run" (or Ctrl+Enter)
-- 4. You should see "Success" message
-- ============================================================================

-- Make started_at and ended_at nullable in breaks table
-- This allows break requests to be created in "pending" status without a start time
DO $$
BEGIN
    -- Make started_at nullable if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'started_at' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.breaks ALTER COLUMN started_at DROP NOT NULL;
        ALTER TABLE public.breaks ALTER COLUMN started_at DROP DEFAULT;
        RAISE NOTICE '✅ Fixed: started_at is now nullable';
    ELSE
        RAISE NOTICE '✅ started_at was already nullable';
    END IF;

    -- Make ended_at nullable if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'ended_at' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.breaks ALTER COLUMN ended_at DROP NOT NULL;
        ALTER TABLE public.breaks ALTER COLUMN ended_at DROP DEFAULT;
        RAISE NOTICE '✅ Fixed: ended_at is now nullable';
    ELSE
        RAISE NOTICE '✅ ended_at was already nullable';
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break actually started. NULL for pending/approved breaks that haven''t started yet.';
COMMENT ON COLUMN public.breaks.ended_at IS 'Timestamp when break ended. NULL for pending/approved/active breaks that haven''t ended yet.';

-- Verify the fix
SELECT 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'breaks'
AND column_name IN ('started_at', 'ended_at');
