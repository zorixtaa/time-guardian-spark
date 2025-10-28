-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT
-- ============================================================================
-- This script creates all necessary tables, functions, and policies for the
-- Market Wave Attendance System
-- ============================================================================

-- =============================================================================
-- PART 1: CREATE ENUMS
-- =============================================================================

-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create break_type_enum
DO $$ BEGIN
    CREATE TYPE public.break_type_enum AS ENUM ('coffee', 'wc', 'lunch');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create break_status_enum
DO $$ BEGIN
    CREATE TYPE public.break_status_enum AS ENUM ('active', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create session_status enum
DO $$ BEGIN
    CREATE TYPE public.session_status AS ENUM ('active', 'ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PART 2: CREATE CORE TABLES
-- =============================================================================

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    team_id UUID REFERENCES public.teams(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clock_in_at TIMESTAMPTZ NOT NULL,
    clock_out_at TIMESTAMPTZ,
    shift_id UUID REFERENCES public.shifts(id),
    device_fingerprint TEXT,
    source_ip TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create breaks table
CREATE TABLE IF NOT EXISTS public.breaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id),
    type public.break_type_enum NOT NULL,
    status public.break_status_enum NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    denied_by UUID REFERENCES auth.users(id),
    denied_at TIMESTAMPTZ,
    denial_reason TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create break_entitlements table
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

-- Create entitlement_notifications table
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

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    team_id UUID REFERENCES public.teams(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create XP ledger table
CREATE TABLE IF NOT EXISTS public.xp_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bonus payouts table
CREATE TABLE IF NOT EXISTS public.bonus_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    month DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, paid
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gamification settings table
CREATE TABLE IF NOT EXISTS public.gamification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PART 3: CREATE INDEXES
-- =============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in_at ON public.attendance(clock_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_shift_id ON public.attendance(shift_id);

-- Breaks indexes
CREATE INDEX IF NOT EXISTS idx_breaks_user_id ON public.breaks(user_id);
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_active ON public.breaks(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_breaks_team_id ON public.breaks(team_id);

-- Break entitlements indexes
CREATE INDEX IF NOT EXISTS idx_break_entitlements_user_date ON public.break_entitlements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_break_entitlements_date ON public.break_entitlements(date);

-- Entitlement notifications indexes
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_user ON public.entitlement_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_admin ON public.entitlement_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_notifications_unacknowledged ON public.entitlement_notifications(acknowledged) WHERE acknowledged = FALSE;

-- XP ledger indexes
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_id ON public.xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_created_at ON public.xp_ledger(created_at);

-- Bonus payouts indexes
CREATE INDEX IF NOT EXISTS idx_bonus_payouts_user_id ON public.bonus_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_payouts_month ON public.bonus_payouts(month);

-- =============================================================================
-- PART 4: CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user team
CREATE OR REPLACE FUNCTION public.get_user_team(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    team_uuid UUID;
BEGIN
    SELECT team_id INTO team_uuid
    FROM public.profiles
    WHERE user_id = user_uuid;
    
    RETURN team_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name public.app_role)
RETURNS BOOLEAN AS $$
DECLARE
    has_role BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role = role_name
    ) INTO has_role;
    
    RETURN has_role;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, display_name, team_id, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ),
        NULL,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set break started_at
CREATE OR REPLACE FUNCTION public.set_break_started_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.started_at IS NULL AND NEW.status = 'active' THEN
        NEW.started_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 5: CREATE TRIGGERS
-- =============================================================================

-- Trigger for updated_at columns
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_breaks_updated_at
    BEFORE UPDATE ON public.breaks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_break_entitlements_updated_at
    BEFORE UPDATE ON public.break_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bonus_payouts_updated_at
    BEFORE UPDATE ON public.bonus_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gamification_settings_updated_at
    BEFORE UPDATE ON public.gamification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger for break started_at
DROP TRIGGER IF EXISTS set_break_started_at_trigger ON public.breaks;
CREATE TRIGGER set_break_started_at_trigger
    BEFORE INSERT ON public.breaks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_break_started_at();

-- =============================================================================
-- PART 6: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 7: CREATE RLS POLICIES
-- =============================================================================

-- Teams policies
CREATE POLICY "Users can view their team"
ON public.teams
FOR SELECT
USING (id = get_user_team(auth.uid()));

CREATE POLICY "Admins can view all teams"
ON public.teams
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage teams"
ON public.teams
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team profiles"
ON public.profiles
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND team_id = get_user_team(auth.uid())
);

CREATE POLICY "Super admins can manage profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Shifts policies
CREATE POLICY "Users can view their team shifts"
ON public.shifts
FOR SELECT
USING (team_id = get_user_team(auth.uid()));

CREATE POLICY "Super admins can manage shifts"
ON public.shifts
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Attendance policies
CREATE POLICY "Users can view their own attendance"
ON public.attendance
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendance"
ON public.attendance
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team attendance"
ON public.attendance
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = attendance.user_id 
        AND profiles.team_id = get_user_team(auth.uid())
    )
);

CREATE POLICY "Super admins can manage attendance"
ON public.attendance
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Breaks policies
CREATE POLICY "Users can view their own breaks"
ON public.breaks
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own breaks"
ON public.breaks
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own breaks"
ON public.breaks
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team breaks"
ON public.breaks
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = breaks.user_id 
        AND profiles.team_id = get_user_team(auth.uid())
    )
);

CREATE POLICY "Super admins can manage breaks"
ON public.breaks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

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

-- Announcements policies
CREATE POLICY "Users can view team announcements"
ON public.announcements
FOR SELECT
USING (
    team_id = get_user_team(auth.uid())
    OR team_id IS NULL
);

CREATE POLICY "Admins can manage team announcements"
ON public.announcements
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND team_id = get_user_team(auth.uid())
);

CREATE POLICY "Super admins can manage all announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- XP Ledger policies
CREATE POLICY "Users can view their own XP"
ON public.xp_ledger
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team XP"
ON public.xp_ledger
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = xp_ledger.user_id 
        AND profiles.team_id = get_user_team(auth.uid())
    )
);

CREATE POLICY "Super admins can manage XP"
ON public.xp_ledger
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Bonus Payouts policies
CREATE POLICY "Users can view their own bonuses"
ON public.bonus_payouts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view team bonuses"
ON public.bonus_payouts
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = bonus_payouts.user_id 
        AND profiles.team_id = get_user_team(auth.uid())
    )
);

CREATE POLICY "Super admins can manage bonuses"
ON public.bonus_payouts
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Gamification settings policies
CREATE POLICY "Only super admins can manage gamification settings"
ON public.gamification_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Everyone can view gamification settings"
ON public.gamification_settings
FOR SELECT
USING (true);

-- =============================================================================
-- PART 8: INSERT DEFAULT DATA
-- =============================================================================

-- Insert default gamification settings
INSERT INTO public.gamification_settings (setting_key, setting_value) VALUES
('badge_thresholds', '{
  "punctuality_bronze": 5,
  "punctuality_silver": 10,
  "punctuality_gold": 20,
  "streak_master_1": 5,
  "streak_master_2": 10,
  "streak_master_3": 20,
  "focus_badge": 5,
  "consistency_badge": 1
}'::jsonb),
('xp_rewards', '{
  "on_time_day": 10,
  "perfect_day": 20,
  "perfect_week": 50
}'::jsonb),
('bonus_thresholds', '{
  "monthly_12_perfect_days": 25,
  "top_10_percent": 10
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- PART 9: ADD COMMENTS
-- =============================================================================

COMMENT ON TABLE public.teams IS 'Teams in the organization';
COMMENT ON TABLE public.profiles IS 'User profiles - One per auth user, auto-created on signup';
COMMENT ON TABLE public.user_roles IS 'User role assignments';
COMMENT ON TABLE public.shifts IS 'Work shifts for teams';
COMMENT ON TABLE public.attendance IS 'Employee attendance records';
COMMENT ON TABLE public.breaks IS 'Instant break tracking - coffee, wc, lunch breaks start/end immediately without approval';
COMMENT ON TABLE public.break_entitlements IS 'Daily break entitlements and usage tracking per user';
COMMENT ON TABLE public.entitlement_notifications IS 'Notifications for when users exceed their break entitlements';
COMMENT ON TABLE public.announcements IS 'Team announcements';
COMMENT ON TABLE public.xp_ledger IS 'Experience points ledger for gamification';
COMMENT ON TABLE public.bonus_payouts IS 'Bonus payout records';
COMMENT ON TABLE public.gamification_settings IS 'Gamification system configuration';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'All tables, functions, triggers, and policies have been created.';
    RAISE NOTICE 'The database schema is now coherent and ready for use.';
END $$;