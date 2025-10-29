-- Create critical RPC functions for break management

CREATE OR REPLACE FUNCTION public.request_break(
  p_user_id uuid,
  p_attendance_id uuid,
  p_break_type break_type_enum,
  p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_break_id uuid;
  v_instant_approval boolean;
  v_attendance_record public.attendance%ROWTYPE;
  v_can_request jsonb;
BEGIN
  -- Verify the attendance record exists and belongs to the requesting user
  SELECT * INTO v_attendance_record
  FROM public.attendance
  WHERE id = p_attendance_id
    AND user_id = p_user_id
    AND clock_out_at IS NULL;

  IF v_attendance_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active attendance record found'
    );
  END IF;

  -- Ask the entitlement helper if we can request the break
  SELECT public.can_request_break(p_user_id, p_attendance_id, p_break_type)
  INTO v_can_request;

  IF COALESCE((v_can_request->>'can_request')::boolean, false) = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_can_request->>'reason',
      'work_duration_minutes', (v_can_request->>'work_duration_minutes')::integer,
      'micro_break_remaining', (v_can_request->>'micro_break_remaining')::integer,
      'lunch_break_remaining', (v_can_request->>'lunch_break_remaining')::integer
    );
  END IF;

  -- Determine whether the break qualifies for instant approval based on team capacity
  v_instant_approval := public.should_instant_approve_break(p_user_id, p_team_id);

  -- Insert the break record
  INSERT INTO public.breaks (
    user_id,
    attendance_id,
    type,
    status,
    started_at,
    team_id
  ) VALUES (
    p_user_id,
    p_attendance_id,
    p_break_type,
    CASE WHEN v_instant_approval THEN 'approved'::public.break_status_enum ELSE 'pending'::public.break_status_enum END,
    CASE WHEN v_instant_approval THEN now() ELSE NULL END,
    p_team_id
  )
  RETURNING id INTO v_break_id;

  -- If instantly approved, transition the break to active immediately
  IF v_instant_approval THEN
    UPDATE public.breaks
    SET status = 'active'::public.break_status_enum
    WHERE id = v_break_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'break_id', v_break_id,
    'instant_approval', v_instant_approval,
    'status', CASE WHEN v_instant_approval THEN 'active' ELSE 'pending' END,
    'work_duration_minutes', COALESCE((v_can_request->>'work_duration_minutes')::integer, 0),
    'micro_break_remaining', COALESCE((v_can_request->>'micro_break_remaining')::integer, 30),
    'lunch_break_remaining', COALESCE((v_can_request->>'lunch_break_remaining')::integer, 60)
  );
END;
$$;

-- Function to approve a break
CREATE OR REPLACE FUNCTION public.approve_break(
  p_break_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.breaks
  SET 
    status = 'active'::public.break_status_enum,
    approved_by = p_admin_id,
    approved_at = now(),
    started_at = now()
  WHERE id = p_break_id
    AND status = 'pending'::public.break_status_enum;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Break not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to deny a break
CREATE OR REPLACE FUNCTION public.deny_break(
  p_break_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.breaks
  SET 
    status = 'denied'::public.break_status_enum,
    denied_by = p_admin_id,
    denied_at = now(),
    denial_reason = p_reason
  WHERE id = p_break_id
    AND status = 'pending'::public.break_status_enum;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Break not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get pending break requests
CREATE OR REPLACE FUNCTION public.get_pending_break_requests(
  p_admin_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  break_id uuid,
  user_id uuid,
  user_name text,
  break_type break_type_enum,
  created_at timestamptz,
  team_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as break_id,
    b.user_id,
    COALESCE(p.display_name, 'Unknown') as user_name,
    b.type as break_type,
    b.created_at,
    b.team_id
  FROM public.breaks b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE b.status = 'pending'::public.break_status_enum
    AND (p_admin_team_id IS NULL OR b.team_id = p_admin_team_id OR b.team_id IS NULL)
  ORDER BY b.created_at ASC;
END;
$$;

-- Simple break entitlement functions (returning mock data for now)
CREATE OR REPLACE FUNCTION public.get_daily_break_entitlements(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  micro_break_used integer,
  lunch_break_used integer,
  micro_break_limit integer,
  lunch_break_limit integer,
  micro_break_remaining integer,
  lunch_break_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return default entitlements for now
  RETURN QUERY SELECT 
    0 as micro_break_used,
    0 as lunch_break_used,
    30 as micro_break_limit,
    60 as lunch_break_limit,
    30 as micro_break_remaining,
    60 as lunch_break_remaining;
END;
$$;

-- Function to check if user can request a break
CREATE OR REPLACE FUNCTION public.can_request_break(
  p_user_id uuid,
  p_attendance_id uuid,
  p_break_type break_type_enum,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simplified: always allow for now
  RETURN jsonb_build_object(
    'can_request', true,
    'reason', 'Break allowed',
    'work_duration_minutes', 0,
    'micro_break_remaining', 30,
    'lunch_break_remaining', 60
  );
END;
$$;

-- Function to get entitlement notifications (returns empty for now)
CREATE OR REPLACE FUNCTION public.get_entitlement_notifications(
  p_admin_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  notification_id uuid,
  user_id uuid,
  user_name text,
  team_name text,
  notification_type text,
  entitlement_date date,
  exceeded_amount integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return empty results for now
  RETURN;
END;
$$;

-- Function to acknowledge entitlement notification
CREATE OR REPLACE FUNCTION public.acknowledge_entitlement_notification(
  p_notification_id uuid,
  p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return true for now (no actual table yet)
  RETURN true;
END;
$$;