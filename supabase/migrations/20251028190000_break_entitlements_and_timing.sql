-- ============================================================================
-- BREAK ENTITLEMENTS AND TIMING RESTRICTIONS MIGRATION
-- ============================================================================
-- This migration adds break timing restrictions and daily entitlements
-- ============================================================================

-- Add break entitlement configuration table
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_break_entitlements_user_date ON public.break_entitlements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_break_entitlements_date ON public.break_entitlements(date);

-- Add notification tracking for exceeded entitlements
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

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_user ON public.entitlement_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_admin ON public.entitlement_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_unacknowledged ON public.entitlement_notifications(acknowledged) WHERE acknowledged = FALSE;

-- Function to get or create daily break entitlements
CREATE OR REPLACE FUNCTION public.get_daily_break_entitlements(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  micro_break_used INTEGER,
  lunch_break_used INTEGER,
  micro_break_limit INTEGER,
  lunch_break_limit INTEGER,
  micro_break_remaining INTEGER,
  lunch_break_remaining INTEGER
) AS $$
DECLARE
  v_entitlement RECORD;
BEGIN
  -- Get or create entitlement record for the day
  INSERT INTO public.break_entitlements (user_id, date, micro_break_used, lunch_break_used)
  VALUES (p_user_id, p_date, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Get the entitlement record
  SELECT * INTO v_entitlement
  FROM public.break_entitlements
  WHERE user_id = p_user_id AND date = p_date;
  
  -- Return the entitlements
  RETURN QUERY
  SELECT 
    v_entitlement.micro_break_used,
    v_entitlement.lunch_break_used,
    v_entitlement.micro_break_limit,
    v_entitlement.lunch_break_limit,
    (v_entitlement.micro_break_limit - v_entitlement.micro_break_used) as micro_break_remaining,
    (v_entitlement.lunch_break_limit - v_entitlement.lunch_break_used) as lunch_break_remaining;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can request a break based on timing and entitlements
CREATE OR REPLACE FUNCTION public.can_request_break(
  p_user_id UUID,
  p_attendance_id UUID,
  p_break_type public.break_type_enum,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  v_attendance RECORD;
  v_last_break_end TIMESTAMPTZ;
  v_work_duration_minutes INTEGER;
  v_entitlements RECORD;
  v_break_duration_minutes INTEGER;
  v_can_request BOOLEAN := TRUE;
  v_reason TEXT := '';
BEGIN
  -- Get attendance record
  SELECT * INTO v_attendance
  FROM public.attendance
  WHERE id = p_attendance_id AND user_id = p_user_id AND clock_out_at IS NULL;
  
  IF v_attendance IS NULL THEN
    RETURN json_build_object(
      'can_request', false,
      'reason', 'No active attendance record found'
    );
  END IF;
  
  -- Check if there's already an active break request
  IF EXISTS (
    SELECT 1 FROM public.breaks 
    WHERE user_id = p_user_id 
      AND attendance_id = p_attendance_id 
      AND status IN ('pending', 'approved', 'active')
      AND ended_at IS NULL
  ) THEN
    RETURN json_build_object(
      'can_request', false,
      'reason', 'You already have an active break request or are currently on break'
    );
  END IF;
  
  -- Get last break end time
  SELECT MAX(ended_at) INTO v_last_break_end
  FROM public.breaks
  WHERE user_id = p_user_id 
    AND attendance_id = p_attendance_id 
    AND ended_at IS NOT NULL;
  
  -- Calculate work duration since last break or clock-in
  IF v_last_break_end IS NOT NULL THEN
    v_work_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_last_break_end)) / 60;
  ELSE
    v_work_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_attendance.clock_in_at)) / 60;
  END IF;
  
  -- Check 60-minute minimum work time
  IF v_work_duration_minutes < 60 THEN
    v_can_request := FALSE;
    v_reason := 'You must work for at least 60 minutes before requesting a break. ' || 
                ROUND(60 - v_work_duration_minutes) || ' minutes remaining.';
  END IF;
  
  -- Get daily entitlements
  SELECT * INTO v_entitlements
  FROM public.get_daily_break_entitlements(p_user_id, p_date);
  
  -- Check break-specific entitlements
  IF p_break_type IN ('coffee', 'wc') THEN
    -- Micro-break entitlement (30 minutes per day)
    IF v_entitlements.micro_break_remaining <= 0 THEN
      v_can_request := FALSE;
      v_reason := 'You have used all your micro-break time for today (' || v_entitlements.micro_break_limit || ' minutes).';
    END IF;
  ELSIF p_break_type = 'lunch' THEN
    -- Lunch break entitlement (60 minutes per day)
    IF v_entitlements.lunch_break_remaining <= 0 THEN
      v_can_request := FALSE;
      v_reason := 'You have used all your lunch break time for today (' || v_entitlements.lunch_break_limit || ' minutes).';
    END IF;
  END IF;
  
  RETURN json_build_object(
    'can_request', v_can_request,
    'reason', v_reason,
    'work_duration_minutes', v_work_duration_minutes,
    'micro_break_remaining', v_entitlements.micro_break_remaining,
    'lunch_break_remaining', v_entitlements.lunch_break_remaining
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update break entitlements when a break ends
CREATE OR REPLACE FUNCTION public.update_break_entitlements(
  p_user_id UUID,
  p_break_type public.break_type_enum,
  p_duration_minutes INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
  v_entitlement RECORD;
  v_exceeded_amount INTEGER := 0;
  v_notification_type TEXT;
BEGIN
  -- Get or create entitlement record
  INSERT INTO public.break_entitlements (user_id, date, micro_break_used, lunch_break_used)
  VALUES (p_user_id, p_date, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Update entitlements based on break type
  IF p_break_type IN ('coffee', 'wc') THEN
    UPDATE public.break_entitlements
    SET micro_break_used = micro_break_used + p_duration_minutes,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING * INTO v_entitlement;
    
    -- Check if exceeded micro-break limit
    IF v_entitlement.micro_break_used > v_entitlement.micro_break_limit THEN
      v_exceeded_amount := v_entitlement.micro_break_used - v_entitlement.micro_break_limit;
      v_notification_type := 'micro_break_exceeded';
    END IF;
  ELSIF p_break_type = 'lunch' THEN
    UPDATE public.break_entitlements
    SET lunch_break_used = lunch_break_used + p_duration_minutes,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING * INTO v_entitlement;
    
    -- Check if exceeded lunch break limit
    IF v_entitlement.lunch_break_used > v_entitlement.lunch_break_limit THEN
      v_exceeded_amount := v_entitlement.lunch_break_used - v_entitlement.lunch_break_limit;
      v_notification_type := 'lunch_break_exceeded';
    END IF;
  END IF;
  
  -- Create notification if entitlement exceeded
  IF v_exceeded_amount > 0 THEN
    INSERT INTO public.entitlement_notifications (
      user_id, 
      notification_type, 
      entitlement_date, 
      exceeded_amount
    ) VALUES (
      p_user_id, 
      v_notification_type, 
      p_date, 
      v_exceeded_amount
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin notifications for exceeded entitlements
CREATE OR REPLACE FUNCTION public.get_entitlement_notifications(
  p_admin_team_id UUID DEFAULT NULL
) RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  user_name TEXT,
  team_name TEXT,
  notification_type TEXT,
  entitlement_date DATE,
  exceeded_amount INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    en.id as notification_id,
    en.user_id,
    COALESCE(p.display_name, 'Unknown User') as user_name,
    COALESCE(t.name, 'Unassigned') as team_name,
    en.notification_type,
    en.entitlement_date,
    en.exceeded_amount,
    en.created_at
  FROM public.entitlement_notifications en
  LEFT JOIN public.profiles p ON p.id = en.user_id
  LEFT JOIN public.teams t ON t.id = p.team_id
  WHERE en.acknowledged = FALSE
    AND (p_admin_team_id IS NULL OR p.team_id = p_admin_team_id OR p.team_id IS NULL)
  ORDER BY en.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge entitlement notifications
CREATE OR REPLACE FUNCTION public.acknowledge_entitlement_notification(
  p_notification_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.entitlement_notifications
  SET acknowledged = TRUE, admin_id = p_admin_id
  WHERE id = p_notification_id AND acknowledged = FALSE
  RETURNING 1 INTO v_updated;
  
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Update the request_break function to include timing and entitlement checks
CREATE OR REPLACE FUNCTION public.request_break(
  p_user_id UUID,
  p_attendance_id UUID,
  p_break_type public.break_type_enum,
  p_team_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_break_id UUID;
  v_instant_approve BOOLEAN;
  v_attendance_record RECORD;
  v_can_request JSON;
BEGIN
  -- Check if user can request break
  SELECT * INTO v_can_request
  FROM public.can_request_break(p_user_id, p_attendance_id, p_break_type);
  
  IF NOT (v_can_request->>'can_request')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', v_can_request->>'reason',
      'work_duration_minutes', (v_can_request->>'work_duration_minutes')::INTEGER,
      'micro_break_remaining', (v_can_request->>'micro_break_remaining')::INTEGER,
      'lunch_break_remaining', (v_can_request->>'lunch_break_remaining')::INTEGER
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
    'status', CASE WHEN v_instant_approve THEN 'active' ELSE 'pending' END,
    'work_duration_minutes', (v_can_request->>'work_duration_minutes')::INTEGER,
    'micro_break_remaining', (v_can_request->>'micro_break_remaining')::INTEGER,
    'lunch_break_remaining', (v_can_request->>'lunch_break_remaining')::INTEGER
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update entitlements when break ends
CREATE OR REPLACE FUNCTION public.trigger_update_break_entitlements()
RETURNS TRIGGER AS $$
DECLARE
  v_duration_minutes INTEGER;
BEGIN
  -- Only process when break is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.ended_at IS NOT NULL THEN
    -- Calculate break duration in minutes
    v_duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - COALESCE(NEW.started_at, NEW.created_at))) / 60;
    
    -- Update entitlements
    PERFORM public.update_break_entitlements(
      NEW.user_id,
      NEW.type,
      v_duration_minutes,
      CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_break_entitlements_trigger ON public.breaks;
CREATE TRIGGER update_break_entitlements_trigger
  AFTER UPDATE ON public.breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_break_entitlements();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_daily_break_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_request_break TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_break_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entitlement_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_entitlement_notification TO authenticated;

-- Add comments
COMMENT ON TABLE public.break_entitlements IS 'Daily break entitlements tracking for each user';
COMMENT ON TABLE public.entitlement_notifications IS 'Notifications for exceeded break entitlements';
COMMENT ON FUNCTION public.get_daily_break_entitlements IS 'Get or create daily break entitlements for a user';
COMMENT ON FUNCTION public.can_request_break IS 'Check if user can request a break based on timing and entitlements';
COMMENT ON FUNCTION public.update_break_entitlements IS 'Update break entitlements when a break ends';
COMMENT ON FUNCTION public.get_entitlement_notifications IS 'Get unacknowledged entitlement notifications for admins';
COMMENT ON FUNCTION public.acknowledge_entitlement_notification IS 'Acknowledge an entitlement notification';