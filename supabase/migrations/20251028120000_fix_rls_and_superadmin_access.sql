-- Comprehensive RLS policy fix to ensure superadmin can see everything
-- and all database paths are correctly configured

-- =============================================================================
-- HELPER FUNCTIONS (if they don't exist)
-- =============================================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID,
  _role app_role
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team
CREATE OR REPLACE FUNCTION public.get_user_team(
  _user_id UUID
) RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT team_id
    FROM public.profiles
    WHERE id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DROP EXISTING POLICIES TO RECREATE THEM
-- =============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Attendance policies
DROP POLICY IF EXISTS "Super admins can manage all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view team attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can create their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;

-- Breaks policies
DROP POLICY IF EXISTS "Super admins can manage all breaks" ON public.breaks;
DROP POLICY IF EXISTS "Admins can view team breaks" ON public.breaks;
DROP POLICY IF EXISTS "Admins can manage team breaks" ON public.breaks;
DROP POLICY IF EXISTS "Users can view their own breaks" ON public.breaks;
DROP POLICY IF EXISTS "Users can create their own breaks" ON public.breaks;
DROP POLICY IF EXISTS "Users can update their own breaks" ON public.breaks;

-- Teams policies
DROP POLICY IF EXISTS "Super admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can view their team" ON public.teams;
DROP POLICY IF EXISTS "Users can view their team" ON public.teams;

-- User roles policies
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view team roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Shifts policies
DROP POLICY IF EXISTS "Super admins can manage all shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view their team shifts" ON public.shifts;

-- Sessions policies
DROP POLICY IF EXISTS "Super admins can manage all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can view team sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

-- Badges policies
DROP POLICY IF EXISTS "Super admins can manage badges" ON public.badges;
DROP POLICY IF EXISTS "Everyone can view badges" ON public.badges;

-- User badges policies
DROP POLICY IF EXISTS "Super admins can manage all user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Admins can manage team user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;

-- Files policies
DROP POLICY IF EXISTS "Super admins can manage all files" ON public.files;
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;

-- Announcements policies
DROP POLICY IF EXISTS "Super admins can manage all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view team announcements" ON public.announcements;

-- Metrics policies
DROP POLICY IF EXISTS "Super admins can manage all metrics" ON public.metrics_daily;
DROP POLICY IF EXISTS "Admins can view team metrics" ON public.metrics_daily;

-- =============================================================================
-- CREATE COMPREHENSIVE RLS POLICIES
-- =============================================================================

-- PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (team_id = get_user_team(auth.uid()) OR team_id IS NULL)
);

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ATTENDANCE TABLE
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all attendance"
ON public.attendance FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team attendance"
ON public.attendance FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = attendance.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Users can view their own attendance"
ON public.attendance FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attendance"
ON public.attendance FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendance"
ON public.attendance FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- BREAKS TABLE
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all breaks"
ON public.breaks FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team breaks"
ON public.breaks FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = breaks.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Admins can manage team breaks"
ON public.breaks FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = breaks.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = breaks.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Users can view their own breaks"
ON public.breaks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own breaks"
ON public.breaks FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own breaks"
ON public.breaks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- TEAMS TABLE
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all teams"
ON public.teams FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view their team"
ON public.teams FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND id = get_user_team(auth.uid())
);

CREATE POLICY "Users can view their team"
ON public.teams FOR SELECT
USING (id = get_user_team(auth.uid()));

-- USER ROLES TABLE
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- SHIFTS TABLE
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all shifts"
ON public.shifts FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their team shifts"
ON public.shifts FOR SELECT
USING (
  team_id = get_user_team(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- SESSIONS TABLE
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all sessions"
ON public.sessions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team sessions"
ON public.sessions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = sessions.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Users can view their own sessions"
ON public.sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
ON public.sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.sessions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- BADGES TABLE
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage badges"
ON public.badges FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Everyone can view badges"
ON public.badges FOR SELECT
USING (true);

-- USER BADGES TABLE
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all user badges"
ON public.user_badges FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage team user badges"
ON public.user_badges FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_badges.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_badges.user_id 
    AND (profiles.team_id = get_user_team(auth.uid()) OR profiles.team_id IS NULL)
  )
);

CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid());

-- FILES TABLE
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all files"
ON public.files FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own files"
ON public.files FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own files"
ON public.files FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ANNOUNCEMENTS TABLE
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view team announcements"
ON public.announcements FOR SELECT
USING (
  team_id IS NULL 
  OR team_id = get_user_team(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- METRICS DAILY TABLE
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all metrics"
ON public.metrics_daily FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view team metrics"
ON public.metrics_daily FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (team_id = get_user_team(auth.uid()) OR team_id IS NULL)
);

-- =============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.breaks TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT ON public.badges TO authenticated;
GRANT INSERT ON public.badges TO authenticated;
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT ON public.files TO authenticated;
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.metrics_daily TO authenticated;
GRANT INSERT, UPDATE ON public.metrics_daily TO authenticated;

-- =============================================================================
-- VERIFICATION COMMENT
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles with team assignments - Super admins can see all, admins can see their team';
COMMENT ON TABLE public.attendance IS 'Attendance records - Super admins can see all, admins can see their team';
COMMENT ON TABLE public.breaks IS 'Break records - Super admins can manage all, admins can manage their team';
COMMENT ON TABLE public.teams IS 'Teams/departments - Super admins can manage all';
COMMENT ON TABLE public.user_roles IS 'User role assignments - Super admins can manage all';
