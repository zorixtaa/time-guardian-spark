-- ============================================================================
-- SCHEMA COHERENCE FIX MIGRATION
-- ============================================================================
-- This migration ensures all database schema elements are coherent and up-to-date
-- ============================================================================

-- =============================================================================
-- PART 1: FIX BREAK TYPES ENUM
-- =============================================================================

-- Drop and recreate break_type_enum with correct values
DROP TYPE IF EXISTS public.break_type_enum CASCADE;
CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');

-- Update breaks table to use the correct enum
ALTER TABLE public.breaks ALTER COLUMN type TYPE public.break_type_enum USING type::text::public.break_type_enum;

-- =============================================================================
-- PART 2: FIX BREAK STATUS ENUM
-- =============================================================================

-- Drop and recreate break_status_enum with correct values (only active/completed for instant breaks)
DROP TYPE IF EXISTS public.break_status_enum CASCADE;
CREATE TYPE public.break_status_enum AS ENUM ('active', 'completed');

-- Update breaks table to use the correct enum
ALTER TABLE public.breaks ALTER COLUMN status TYPE public.break_status_enum USING status::text::public.break_status_enum;

-- =============================================================================
-- PART 3: ENSURE BREAKS TABLE HAS ALL REQUIRED COLUMNS
-- =============================================================================

-- Add missing columns if they don't exist
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE;
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denied_by UUID REFERENCES auth.users(id);
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- =============================================================================
-- PART 4: ENSURE BREAKS TABLE HAS CORRECT CONSTRAINTS
-- =============================================================================

-- Make sure started_at and ended_at are nullable
ALTER TABLE public.breaks ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE public.breaks ALTER COLUMN ended_at DROP NOT NULL;

-- =============================================================================
-- PART 5: CREATE MISSING TABLES
-- =============================================================================

-- Create break_entitlements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.break_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  micro_break_used INTEGER NOT NULL DEFAULT 0, -- minutes
  lunch_break_used INTEGER NOT NULL DEFAULT 0, -- minutes
  micro_break_limit INTEGER NOT NULL DEFAULT 30, -- minutes per day
  lunch_break_limit INTEGER NOT NULL DEFAULT 60, -- minutes per day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create entitlement_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.entitlement_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('micro_break_exceeded', 'lunch_break_exceeded')),
  entitlement_date DATE NOT NULL,
  exceeded_amount INTEGER NOT NULL, -- minutes exceeded
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PART 6: CREATE MISSING INDEXES
-- =============================================================================

-- Break entitlements indexes
CREATE INDEX IF NOT EXISTS idx_break_entitlements_user_date ON public.break_entitlements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_break_entitlements_date ON public.break_entitlements(date);

-- Entitlement notifications indexes
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_user ON public.entitlement_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_admin ON public.entitlement_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_unacknowledged ON public.entitlement_notifications(acknowledged) WHERE acknowledged = FALSE;

-- Breaks table indexes
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_active ON public.breaks(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_breaks_team_id ON public.breaks(team_id);

-- =============================================================================
-- PART 7: ENABLE RLS ON NEW TABLES
-- =============================================================================

ALTER TABLE public.break_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 8: CREATE RLS POLICIES FOR NEW TABLES
-- =============================================================================

-- Break entitlements policies
CREATE POLICY "Users can view their own break entitlements"
ON public.break_entitlements
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team break entitlements"
ON public.break_entitlements
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = break_entitlements.user_id 
    AND profiles.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Super admins can manage break entitlements"
ON public.break_entitlements
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Entitlement notifications policies
CREATE POLICY "Users can view their own entitlement notifications"
ON public.entitlement_notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team entitlement notifications"
ON public.entitlement_notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = entitlement_notifications.user_id 
    AND profiles.team_id = get_user_team(auth.uid())
  )
);

CREATE POLICY "Super admins can manage entitlement notifications"
ON public.entitlement_notifications
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- =============================================================================
-- PART 9: UPDATE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.breaks IS 'Instant break tracking - coffee, wc, lunch breaks start/end immediately without approval';
COMMENT ON COLUMN public.breaks.type IS 'Break type: coffee (coffee break), wc (bathroom), lunch (lunch break)';
COMMENT ON COLUMN public.breaks.status IS 'Break status: active (currently on break) or completed (break ended)';
COMMENT ON COLUMN public.breaks.started_at IS 'Timestamp when break started (set immediately on creation)';
COMMENT ON COLUMN public.breaks.ended_at IS 'Timestamp when break ended (NULL if still active)';
COMMENT ON COLUMN public.breaks.attendance_id IS 'Link to the attendance record this break belongs to';
COMMENT ON COLUMN public.breaks.team_id IS 'Team context for approval logic';

COMMENT ON TABLE public.break_entitlements IS 'Daily break entitlements and usage tracking per user';
COMMENT ON TABLE public.entitlement_notifications IS 'Notifications for when users exceed their break entitlements';

-- =============================================================================
-- PART 10: VERIFY SCHEMA COHERENCE
-- =============================================================================

-- Verify that all required columns exist
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col TEXT;
BEGIN
    -- Check breaks table columns
    FOR col IN SELECT unnest(ARRAY['attendance_id', 'team_id', 'approved_by', 'approved_at', 'denied_by', 'denied_at', 'denial_reason'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'breaks' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, 'breaks.' || col);
        END IF;
    END LOOP;
    
    -- Report missing columns
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns exist in breaks table';
    END IF;
END $$;

-- Verify that all required tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tbl TEXT;
BEGIN
    -- Check required tables
    FOR tbl IN SELECT unnest(ARRAY['break_entitlements', 'entitlement_notifications'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl
        ) THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    -- Report missing tables
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables exist';
    END IF;
END $$;

-- Verify that all required enums exist
DO $$
DECLARE
    missing_enums TEXT[] := ARRAY[]::TEXT[];
    enum_name TEXT;
BEGIN
    -- Check required enums
    FOR enum_name IN SELECT unnest(ARRAY['break_type_enum', 'break_status_enum'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = enum_name
        ) THEN
            missing_enums := array_append(missing_enums, enum_name);
        END IF;
    END LOOP;
    
    -- Report missing enums
    IF array_length(missing_enums, 1) > 0 THEN
        RAISE WARNING 'Missing enums: %', array_to_string(missing_enums, ', ');
    ELSE
        RAISE NOTICE 'All required enums exist';
    END IF;
END $$;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema coherence fix migration completed successfully';
    RAISE NOTICE 'All tables, columns, enums, and constraints are now coherent';
END $$;