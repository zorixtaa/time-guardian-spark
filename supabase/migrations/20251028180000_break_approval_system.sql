-- ============================================================================
-- BREAK APPROVAL SYSTEM MIGRATION
-- ============================================================================
-- This migration adds admin approval system for breaks with instant approval
-- when less than 20% of team is online
-- ============================================================================

-- Add new break status for pending approval
ALTER TYPE public.break_status_enum DROP IF EXISTS;
CREATE TYPE public.break_status_enum AS ENUM ('pending', 'approved', 'denied', 'active', 'completed');

-- Update breaks table to use new status enum
DO $$ 
BEGIN
  -- Add a temporary column with the new type
  ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS status_new public.break_status_enum;
  
  -- Migrate existing data
  UPDATE public.breaks 
  SET status_new = CASE 
    WHEN status = 'active' THEN 'active'::public.break_status_enum
    WHEN status = 'completed' THEN 'completed'::public.break_status_enum
    ELSE 'completed'::public.break_status_enum
  END
  WHERE status_new IS NULL;
  
  -- Drop old column and rename new one
  ALTER TABLE public.breaks DROP COLUMN IF EXISTS status CASCADE;
  ALTER TABLE public.breaks RENAME COLUMN status_new TO status;
  ALTER TABLE public.breaks ALTER COLUMN status SET NOT NULL;
  
EXCEPTION 
  WHEN undefined_column THEN
    -- If status column doesn't exist as text, it might already be the enum
    NULL;
END $$;

-- Add approval tracking columns
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denied_by UUID REFERENCES auth.users(id);
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- Add team context for approval logic
ALTER TABLE public.breaks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Create function to check if instant approval should be granted
CREATE OR REPLACE FUNCTION public.should_instant_approve_break(
  p_user_id UUID,
  p_team_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  total_team_members INTEGER;
  active_team_members INTEGER;
  approval_threshold DECIMAL := 0.20; -- 20%
BEGIN
  -- If no team, require approval
  IF p_team_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Count total team members
  SELECT COUNT(*) INTO total_team_members
  FROM public.profiles
  WHERE team_id = p_team_id;
  
  -- If no team members, require approval
  IF total_team_members = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Count active team members (checked in today and not on break)
  SELECT COUNT(*) INTO active_team_members
  FROM public.profiles p
  LEFT JOIN public.attendance a ON a.user_id = p.id 
    AND a.clock_in_at >= CURRENT_DATE 
    AND a.clock_out_at IS NULL
  LEFT JOIN public.breaks b ON b.user_id = p.id 
    AND b.status IN ('active', 'pending', 'approved')
    AND b.attendance_id = a.id
  WHERE p.team_id = p_team_id
    AND a.id IS NOT NULL
    AND b.id IS NULL; -- Not on any break
  
  -- Check if active percentage is below threshold
  RETURN (active_team_members::DECIMAL / total_team_members::DECIMAL) < approval_threshold;
END;
$$ LANGUAGE plpgsql;

-- Create function to request a break
CREATE OR REPLACE FUNCTION public.request_break(
  p_user_id UUID,
  p_attendance_id UUID,
  p_break_type public.break_type_enum,
  p_team_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_break_id UUID;
  v_instant_approve BOOLEAN;
  v_existing_break UUID;
  v_attendance_record RECORD;
BEGIN
  -- Check if user has an active break already
  SELECT id INTO v_existing_break
  FROM public.breaks
  WHERE user_id = p_user_id
    AND attendance_id = p_attendance_id
    AND status IN ('pending', 'approved', 'active')
    AND ended_at IS NULL;
  
  IF v_existing_break IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You already have an active break request or are currently on break'
    );
  END IF;
  
  -- Get attendance record to verify it exists and is active
  SELECT * INTO v_attendance_record
  FROM public.attendance
  WHERE id = p_attendance_id
    AND user_id = p_user_id
    AND clock_out_at IS NULL;
  
  IF v_attendance_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active attendance record found'
    );
  END IF;
  
  -- Check if instant approval should be granted
  v_instant_approve := public.should_instant_approve_break(p_user_id, p_team_id);
  
  -- Insert break request
  INSERT INTO public.breaks (
    user_id,
    attendance_id,
    type,
    status,
    team_id,
    started_at
  ) VALUES (
    p_user_id,
    p_attendance_id,
    p_break_type,
    CASE 
      WHEN v_instant_approve THEN 'approved'
      ELSE 'pending'
    END,
    p_team_id,
    CASE 
      WHEN v_instant_approve THEN NOW()
      ELSE NULL
    END
  ) RETURNING id INTO v_break_id;
  
  -- If instant approval, also set the break as active
  IF v_instant_approve THEN
    UPDATE public.breaks
    SET status = 'active'
    WHERE id = v_break_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'break_id', v_break_id,
    'instant_approval', v_instant_approve,
    'status', CASE WHEN v_instant_approve THEN 'active' ELSE 'pending' END
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to approve a break
CREATE OR REPLACE FUNCTION public.approve_break(
  p_break_id UUID,
  p_admin_id UUID
) RETURNS JSON AS $$
DECLARE
  v_break_record RECORD;
BEGIN
  -- Get break record
  SELECT * INTO v_break_record
  FROM public.breaks
  WHERE id = p_break_id
    AND status = 'pending';
  
  IF v_break_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Break request not found or already processed'
    );
  END IF;
  
  -- Update break to approved and active
  UPDATE public.breaks
  SET status = 'approved',
      approved_by = p_admin_id,
      approved_at = NOW(),
      started_at = NOW()
  WHERE id = p_break_id;
  
  -- Set as active
  UPDATE public.breaks
  SET status = 'active'
  WHERE id = p_break_id;
  
  RETURN json_build_object(
    'success', true,
    'break_id', p_break_id,
    'status', 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to deny a break
CREATE OR REPLACE FUNCTION public.deny_break(
  p_break_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_break_record RECORD;
BEGIN
  -- Get break record
  SELECT * INTO v_break_record
  FROM public.breaks
  WHERE id = p_break_id
    AND status = 'pending';
  
  IF v_break_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Break request not found or already processed'
    );
  END IF;
  
  -- Update break to denied
  UPDATE public.breaks
  SET status = 'denied',
      denied_by = p_admin_id,
      denied_at = NOW(),
      denial_reason = p_reason
  WHERE id = p_break_id;
  
  RETURN json_build_object(
    'success', true,
    'break_id', p_break_id,
    'status', 'denied'
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get pending break requests for admins
CREATE OR REPLACE FUNCTION public.get_pending_break_requests(
  p_admin_team_id UUID DEFAULT NULL
) RETURNS TABLE (
  break_id UUID,
  user_id UUID,
  user_name TEXT,
  break_type public.break_type_enum,
  requested_at TIMESTAMPTZ,
  team_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as break_id,
    b.user_id,
    COALESCE(p.display_name, 'Unknown User') as user_name,
    b.type as break_type,
    b.created_at as requested_at,
    COALESCE(t.name, 'Unassigned') as team_name
  FROM public.breaks b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.teams t ON t.id = b.team_id
  WHERE b.status = 'pending'
    AND (p_admin_team_id IS NULL OR b.team_id = p_admin_team_id OR b.team_id IS NULL)
  ORDER BY b.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breaks_status ON public.breaks(status);
CREATE INDEX IF NOT EXISTS idx_breaks_team_id ON public.breaks(team_id);
CREATE INDEX IF NOT EXISTS idx_breaks_pending ON public.breaks(status, team_id) WHERE status = 'pending';

-- Update comments
COMMENT ON FUNCTION public.should_instant_approve_break IS 'Determines if a break should be instantly approved based on team availability';
COMMENT ON FUNCTION public.request_break IS 'Requests a break with automatic approval if team availability is low';
COMMENT ON FUNCTION public.approve_break IS 'Approves a pending break request';
COMMENT ON FUNCTION public.deny_break IS 'Denies a pending break request';
COMMENT ON FUNCTION public.get_pending_break_requests IS 'Gets all pending break requests for admin review';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.should_instant_approve_break TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_break TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_break TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_break TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_break_requests TO authenticated;