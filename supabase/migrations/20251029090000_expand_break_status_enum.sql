-- Ensure break_status_enum supports administrative workflows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'break_status_enum'
  ) THEN
    CREATE TYPE public.break_status_enum AS ENUM ('pending', 'approved', 'denied', 'active', 'completed');
  END IF;
END $$;

-- Add missing enum values for pending approval workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'break_status_enum'::regtype
      AND enumlabel = 'pending'
  ) THEN
    ALTER TYPE public.break_status_enum ADD VALUE 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'break_status_enum'::regtype
      AND enumlabel = 'approved'
  ) THEN
    ALTER TYPE public.break_status_enum ADD VALUE 'approved';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'break_status_enum'::regtype
      AND enumlabel = 'denied'
  ) THEN
    ALTER TYPE public.break_status_enum ADD VALUE 'denied';
  END IF;
END $$;

-- Ensure existing values remain valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'break_status_enum'::regtype
      AND enumlabel = 'active'
  ) THEN
    ALTER TYPE public.break_status_enum ADD VALUE 'active';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'break_status_enum'::regtype
      AND enumlabel = 'completed'
  ) THEN
    ALTER TYPE public.break_status_enum ADD VALUE 'completed';
  END IF;
END $$;

-- Update comments to reflect the expanded workflow
COMMENT ON TYPE public.break_status_enum IS 'Break workflow status: pending, approved, denied, active, completed';
COMMENT ON COLUMN public.breaks.status IS 'Break status values used for pending approval workflow';

-- Recreate helpful index for pending break requests (safe if it already exists)
CREATE INDEX IF NOT EXISTS idx_breaks_pending
  ON public.breaks(status, team_id)
  WHERE status = 'pending';
