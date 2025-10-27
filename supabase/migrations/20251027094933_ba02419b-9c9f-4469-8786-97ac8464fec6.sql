-- Create XP ledger table for tracking experience points
CREATE TABLE public.xp_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bonus payouts table
CREATE TABLE public.bonus_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, paid
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gamification settings table
CREATE TABLE public.gamification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

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

-- Gamification settings policies (only superadmins)
CREATE POLICY "Only super admins can manage gamification settings"
ON public.gamification_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Everyone can view gamification settings"
ON public.gamification_settings
FOR SELECT
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_bonus_payouts_updated_at
BEFORE UPDATE ON public.bonus_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gamification_settings_updated_at
BEFORE UPDATE ON public.gamification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
}'::jsonb);