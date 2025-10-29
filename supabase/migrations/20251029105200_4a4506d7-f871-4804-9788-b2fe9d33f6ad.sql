-- Fix schema mismatch - align with actual database state

-- 1. Add missing columns to breaks table
ALTER TABLE public.breaks 
ADD COLUMN IF NOT EXISTS attendance_id uuid REFERENCES public.attendance(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS denied_by uuid,
ADD COLUMN IF NOT EXISTS denied_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS denial_reason text;

-- 2. Make started_at nullable (for pending breaks)
ALTER TABLE public.breaks ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE public.breaks ALTER COLUMN started_at DROP DEFAULT;

-- 3. Update break_type enum: micro->coffee, add wc
-- First, convert column to text
ALTER TABLE public.breaks ALTER COLUMN type TYPE text USING type::text;

-- Update existing values: micro becomes coffee
UPDATE public.breaks SET type = 'coffee' WHERE type = 'micro';

-- Drop and recreate enum with all needed values
DROP TYPE IF EXISTS break_type_enum CASCADE;
CREATE TYPE break_type_enum AS ENUM ('coffee', 'wc', 'lunch', 'emergency');

-- Convert column back to enum
ALTER TABLE public.breaks ALTER COLUMN type TYPE break_type_enum USING type::break_type_enum;
ALTER TABLE public.breaks ALTER COLUMN type SET DEFAULT 'coffee'::break_type_enum;

-- Also update break_type alias if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'break_type') THEN
    DROP TYPE break_type CASCADE;
  END IF;
  CREATE TYPE break_type AS ENUM ('coffee', 'wc', 'lunch', 'emergency');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if already exists or other issues
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_team_id ON public.breaks(team_id);
CREATE INDEX IF NOT EXISTS idx_breaks_status ON public.breaks(status);
CREATE INDEX IF NOT EXISTS idx_breaks_user_id ON public.breaks(user_id);

-- 5. Add helpful comments
COMMENT ON COLUMN public.breaks.attendance_id IS 'Link to attendance record for this break';
COMMENT ON COLUMN public.breaks.team_id IS 'Team context for break request approval';
COMMENT ON COLUMN public.breaks.started_at IS 'When break actually started (NULL for pending)';
COMMENT ON COLUMN public.breaks.approved_at IS 'When break was approved by admin';
COMMENT ON COLUMN public.breaks.denied_by IS 'Admin who denied the break';
COMMENT ON COLUMN public.breaks.denied_at IS 'When break was denied';
COMMENT ON COLUMN public.breaks.denial_reason IS 'Reason for denying the break';

-- 6. Update RLS policies to handle team_id properly
DROP POLICY IF EXISTS "Admins can manage team breaks" ON public.breaks;
CREATE POLICY "Admins can manage team breaks" ON public.breaks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (team_id = get_user_team(auth.uid()) OR team_id IS NULL)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (team_id = get_user_team(auth.uid()) OR team_id IS NULL)
);