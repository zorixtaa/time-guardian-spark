-- ============================================================================
-- FIX BREAKS TYPE COLUMN MIGRATION
-- ============================================================================
-- This migration ensures the breaks table has the type column with correct enum
-- ============================================================================

-- First, ensure the break_type_enum exists
DO $$ BEGIN
    CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check if the type column exists, if not add it
DO $$
BEGIN
    -- Check if type column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'type'
    ) THEN
        -- Add the type column
        ALTER TABLE public.breaks ADD COLUMN type public.break_type_enum NOT NULL DEFAULT 'coffee';
        RAISE NOTICE 'Added type column to breaks table';
    ELSE
        -- Column exists, just ensure it's the right type
        ALTER TABLE public.breaks ALTER COLUMN type TYPE public.break_type_enum USING type::text::public.break_type_enum;
        RAISE NOTICE 'Updated type column in breaks table';
    END IF;
END $$;

-- Ensure the column is NOT NULL
ALTER TABLE public.breaks ALTER COLUMN type SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.breaks.type IS 'Break type: coffee (coffee break), wc (bathroom), lunch (lunch break)';

-- Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'breaks' 
        AND column_name = 'type'
        AND data_type = 'USER-DEFINED'
        AND udt_name = 'break_type_enum'
    ) THEN
        RAISE NOTICE 'SUCCESS: breaks.type column exists with correct enum type';
    ELSE
        RAISE EXCEPTION 'FAILED: breaks.type column is missing or has wrong type';
    END IF;
END $$;