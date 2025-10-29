-- Create helper functions for new roles (separate migration after enum expansion)
CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'hr_manager'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_it_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'it_manager'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_dpo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'dpo'
  )
$$;

-- Create function to start an approved break
CREATE OR REPLACE FUNCTION public.start_approved_break(
  p_break_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_break breaks%ROWTYPE;
BEGIN
  -- Get the break and verify it's approved and belongs to user
  SELECT * INTO v_break
  FROM breaks
  WHERE id = p_break_id
    AND user_id = p_user_id
    AND status = 'approved'
    AND started_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Break not found or not in approved state'
    );
  END IF;

  -- Update break to active with started_at timestamp
  UPDATE breaks
  SET status = 'active',
      started_at = now(),
      updated_at = now()
  WHERE id = p_break_id;

  RETURN jsonb_build_object(
    'success', true,
    'break_id', p_break_id,
    'started_at', now()
  );
END;
$$;