-- Fix: Replace overly permissive shifts policy with team-scoped access
DROP POLICY IF EXISTS "Users can view shifts" ON public.shifts;

CREATE POLICY "Users can view their team shifts"
ON public.shifts
FOR SELECT
USING (team_id = get_user_team(auth.uid()));