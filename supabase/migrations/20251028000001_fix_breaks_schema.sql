-- Fix breaks table schema to allow null started_at for pending/approved breaks
-- This allows breaks to be requested without immediately starting them

ALTER TABLE public.breaks 
ALTER COLUMN started_at DROP NOT NULL,
ALTER COLUMN started_at DROP DEFAULT;

-- Update the comment to clarify the intent
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break actually started. NULL for pending/approved breaks that haven''t started yet.';
