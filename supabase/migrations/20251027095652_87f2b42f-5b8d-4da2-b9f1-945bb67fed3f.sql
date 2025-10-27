-- Assign superadmin role to zouhair.ouqaf@market-wave.com
-- This user needs to sign up first, then this will assign the role

DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'zouhair.ouqaf@market-wave.com';

  -- Only insert if user exists
  IF user_uuid IS NOT NULL THEN
    -- Check if role already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = user_uuid AND role = 'super_admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_uuid, 'super_admin');
    END IF;
  END IF;
END $$;