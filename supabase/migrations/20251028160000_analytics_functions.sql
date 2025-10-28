-- ============================================================================
-- ANALYTICS AND REPORTING FUNCTIONS
-- ============================================================================
-- This migration adds comprehensive analytics functions for the attendance system
-- including work summaries, leaderboards, break statistics, and productivity metrics
-- ============================================================================

-- ============================================================================
-- 1. USER WORK SUMMARY
-- Get detailed work statistics for a user within a date range
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_work_summary(
  p_user_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  total_days_worked INT,
  total_hours_clocked NUMERIC,
  total_break_hours NUMERIC,
  effective_work_hours NUMERIC,
  coffee_break_count INT,
  wc_break_count INT,
  lunch_break_count INT,
  avg_daily_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT DATE(a.clock_in_at))::INT as total_days_worked,
    ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600)::NUMERIC, 2) as total_hours_clocked,
    ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 3600), 0)::NUMERIC, 2) as total_break_hours,
    ROUND((SUM(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600) - 
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 3600), 0))::NUMERIC, 2) as effective_work_hours,
    COUNT(CASE WHEN b.type = 'coffee' THEN 1 END)::INT as coffee_break_count,
    COUNT(CASE WHEN b.type = 'wc' THEN 1 END)::INT as wc_break_count,
    COUNT(CASE WHEN b.type = 'lunch' THEN 1 END)::INT as lunch_break_count,
    ROUND((SUM(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600) / 
           NULLIF(COUNT(DISTINCT DATE(a.clock_in_at)), 0))::NUMERIC, 2) as avg_daily_hours
  FROM public.attendance a
  LEFT JOIN public.breaks b ON b.attendance_id = a.id
  WHERE a.user_id = p_user_id
    AND a.clock_in_at >= p_start_date
    AND a.clock_in_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_work_summary IS 'Get comprehensive work statistics for a user including hours worked, breaks taken, and averages';

-- ============================================================================
-- 2. TEAM DAILY STATISTICS
-- Get real-time statistics for a team on a specific date
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_team_daily_stats(
  p_team_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_members_checked_in INT,
  currently_active INT,
  on_coffee_break INT,
  on_wc_break INT,
  on_lunch_break INT,
  total_hours_worked NUMERIC,
  avg_hours_per_person NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH team_members AS (
    SELECT id FROM public.profiles 
    WHERE (p_team_id IS NULL AND team_id IS NULL) OR team_id = p_team_id
  ),
  daily_attendance AS (
    SELECT a.*
    FROM public.attendance a
    INNER JOIN team_members tm ON a.user_id = tm.id
    WHERE DATE(a.clock_in_at) = p_date
  ),
  active_breaks AS (
    SELECT b.*
    FROM public.breaks b
    INNER JOIN daily_attendance da ON b.attendance_id = da.id
    WHERE b.status = 'active' AND b.ended_at IS NULL
  )
  SELECT
    COUNT(DISTINCT da.user_id)::INT as total_members_checked_in,
    COUNT(DISTINCT CASE WHEN da.clock_out_at IS NULL AND ab.id IS NULL THEN da.user_id END)::INT as currently_active,
    COUNT(CASE WHEN ab.type = 'coffee' THEN 1 END)::INT as on_coffee_break,
    COUNT(CASE WHEN ab.type = 'wc' THEN 1 END)::INT as on_wc_break,
    COUNT(CASE WHEN ab.type = 'lunch' THEN 1 END)::INT as on_lunch_break,
    ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(da.clock_out_at, NOW()) - da.clock_in_at)) / 3600)::NUMERIC, 2) as total_hours_worked,
    ROUND((SUM(EXTRACT(EPOCH FROM (COALESCE(da.clock_out_at, NOW()) - da.clock_in_at)) / 3600) / 
           NULLIF(COUNT(DISTINCT da.user_id), 0))::NUMERIC, 2) as avg_hours_per_person
  FROM daily_attendance da
  LEFT JOIN active_breaks ab ON ab.attendance_id = da.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_team_daily_stats IS 'Get real-time daily statistics for a team including active members and break status';

-- ============================================================================
-- 3. XP LEADERBOARD
-- Get top users by XP with ranking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_xp_leaderboard(
  p_limit INT DEFAULT 10,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  team_name TEXT,
  total_xp INT,
  level INT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_xp AS (
    SELECT 
      xt.user_id,
      SUM(xt.amount) as total_xp
    FROM public.xp_transactions xt
    GROUP BY xt.user_id
  ),
  user_levels AS (
    SELECT 
      ux.user_id,
      ux.total_xp,
      FLOOR((ux.total_xp / 100.0))::INT + 1 as level
    FROM user_xp ux
  )
  SELECT 
    ul.user_id,
    p.display_name,
    COALESCE(t.name, 'Unassigned') as team_name,
    ul.total_xp::INT,
    ul.level,
    ROW_NUMBER() OVER (ORDER BY ul.total_xp DESC) as rank
  FROM user_levels ul
  INNER JOIN public.profiles p ON ul.user_id = p.id
  LEFT JOIN public.teams t ON p.team_id = t.id
  WHERE p_team_id IS NULL OR p.team_id = p_team_id
  ORDER BY ul.total_xp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_xp_leaderboard IS 'Get top users by XP with their level and rank';

-- ============================================================================
-- 4. ATTENDANCE STREAK LEADERBOARD
-- Get users with the longest current attendance streaks
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(
  p_limit INT DEFAULT 10,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  team_name TEXT,
  current_streak INT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_streaks AS (
    SELECT 
      p.id as user_id,
      p.display_name,
      COALESCE(t.name, 'Unassigned') as team_name,
      COUNT(DISTINCT DATE(a.clock_in_at))::INT as current_streak
    FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    LEFT JOIN public.attendance a ON a.user_id = p.id 
      AND a.clock_in_at >= CURRENT_DATE - INTERVAL '60 days'
    WHERE (p_team_id IS NULL OR p.team_id = p_team_id)
    GROUP BY p.id, p.display_name, t.name
    HAVING COUNT(DISTINCT DATE(a.clock_in_at)) > 0
  )
  SELECT 
    us.user_id,
    us.display_name,
    us.team_name,
    us.current_streak,
    ROW_NUMBER() OVER (ORDER BY us.current_streak DESC) as rank
  FROM user_streaks us
  ORDER BY us.current_streak DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_streak_leaderboard IS 'Get users with longest attendance streaks in the last 60 days';

-- ============================================================================
-- 5. BREAK STATISTICS
-- Get detailed break duration statistics for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_break_statistics(
  p_user_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  break_type public.break_type_enum,
  total_breaks BIGINT,
  total_minutes NUMERIC,
  avg_duration_minutes NUMERIC,
  min_duration_minutes NUMERIC,
  max_duration_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.type as break_type,
    COUNT(*) as total_breaks,
    ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 60)::NUMERIC, 2) as total_minutes,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 60)::NUMERIC, 2) as avg_duration_minutes,
    ROUND(MIN(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 60)::NUMERIC, 2) as min_duration_minutes,
    ROUND(MAX(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 60)::NUMERIC, 2) as max_duration_minutes
  FROM public.breaks b
  WHERE b.user_id = p_user_id
    AND b.created_at >= p_start_date
    AND b.created_at <= p_end_date
    AND b.started_at IS NOT NULL
  GROUP BY b.type
  ORDER BY b.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_break_statistics IS 'Get detailed break duration statistics by type for a user';

-- ============================================================================
-- 6. RECENT ACTIVITY LOG
-- Get recent activity across the system for admin monitoring
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_recent_activity(
  p_team_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  activity_id TEXT,
  user_id UUID,
  user_name TEXT,
  activity_type TEXT,
  activity_description TEXT,
  occurred_at TIMESTAMP,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH attendance_events AS (
    SELECT 
      'att-' || a.id::TEXT as activity_id,
      a.user_id,
      p.display_name as user_name,
      CASE 
        WHEN a.clock_out_at IS NOT NULL THEN 'check_out'
        ELSE 'check_in'
      END as activity_type,
      CASE 
        WHEN a.clock_out_at IS NOT NULL THEN 'Checked out'
        ELSE 'Checked in'
      END as activity_description,
      COALESCE(a.clock_out_at, a.clock_in_at) as occurred_at,
      jsonb_build_object(
        'clock_in_at', a.clock_in_at,
        'clock_out_at', a.clock_out_at
      ) as metadata
    FROM public.attendance a
    INNER JOIN public.profiles p ON a.user_id = p.id
    WHERE p_team_id IS NULL OR p.team_id = p_team_id
  ),
  break_events AS (
    SELECT 
      'brk-' || b.id::TEXT as activity_id,
      b.user_id,
      p.display_name as user_name,
      'break_' || b.type::TEXT || '_' || 
        CASE WHEN b.ended_at IS NOT NULL THEN 'end' ELSE 'start' END as activity_type,
      CASE 
        WHEN b.ended_at IS NOT NULL THEN 'Ended ' || b.type::TEXT || ' break'
        ELSE 'Started ' || b.type::TEXT || ' break'
      END as activity_description,
      COALESCE(b.ended_at, b.started_at, b.created_at) as occurred_at,
      jsonb_build_object(
        'type', b.type,
        'started_at', b.started_at,
        'ended_at', b.ended_at,
        'status', b.status
      ) as metadata
    FROM public.breaks b
    INNER JOIN public.profiles p ON b.user_id = p.id
    WHERE p_team_id IS NULL OR p.team_id = p_team_id
  )
  SELECT * FROM (
    SELECT * FROM attendance_events
    UNION ALL
    SELECT * FROM break_events
  ) combined
  ORDER BY occurred_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_recent_activity IS 'Get recent activity feed of check-ins, check-outs, and breaks for admin monitoring';

-- ============================================================================
-- 7. DEPARTMENT PRODUCTIVITY COMPARISON
-- Compare productivity metrics across departments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_department_productivity(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_members BIGINT,
  avg_hours_per_member NUMERIC,
  avg_effective_hours NUMERIC,
  total_breaks BIGINT,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range_days AS (
    SELECT (p_end_date - p_start_date + 1) as days
  ),
  team_stats AS (
    SELECT 
      t.id as team_id,
      t.name as team_name,
      COUNT(DISTINCT p.id) as total_members,
      COUNT(DISTINCT a.id) as total_attendance_records,
      ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600), 0)::NUMERIC, 2) as avg_hours_per_member,
      COUNT(b.id) as total_breaks,
      (SELECT days FROM date_range_days) as period_days
    FROM public.teams t
    LEFT JOIN public.profiles p ON p.team_id = t.id
    LEFT JOIN public.attendance a ON a.user_id = p.id 
      AND DATE(a.clock_in_at) BETWEEN p_start_date AND p_end_date
    LEFT JOIN public.breaks b ON b.attendance_id = a.id
    GROUP BY t.id, t.name
  ),
  unassigned_stats AS (
    SELECT 
      NULL::UUID as team_id,
      'Unassigned' as team_name,
      COUNT(DISTINCT p.id) as total_members,
      COUNT(DISTINCT a.id) as total_attendance_records,
      ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600), 0)::NUMERIC, 2) as avg_hours_per_member,
      COUNT(b.id) as total_breaks,
      (SELECT days FROM date_range_days) as period_days
    FROM public.profiles p
    LEFT JOIN public.attendance a ON a.user_id = p.id 
      AND DATE(a.clock_in_at) BETWEEN p_start_date AND p_end_date
    LEFT JOIN public.breaks b ON b.attendance_id = a.id
    WHERE p.team_id IS NULL
    GROUP BY p.team_id
  )
  SELECT 
    ts.team_id,
    ts.team_name,
    ts.total_members,
    COALESCE(ts.avg_hours_per_member, 0) as avg_hours_per_member,
    ROUND(COALESCE(ts.avg_hours_per_member * 0.85, 0)::NUMERIC, 2) as avg_effective_hours,
    ts.total_breaks,
    ROUND((ts.total_attendance_records::NUMERIC / NULLIF(ts.total_members * ts.period_days, 0) * 100), 2) as attendance_rate
  FROM (
    SELECT * FROM team_stats
    UNION ALL
    SELECT * FROM unassigned_stats
  ) ts
  WHERE ts.total_members > 0
  ORDER BY ts.avg_hours_per_member DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_department_productivity IS 'Compare productivity metrics across all departments including attendance rate and hours worked';

-- ============================================================================
-- 8. USER DAILY BREAKDOWN
-- Get detailed day-by-day breakdown for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_daily_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  work_date DATE,
  clock_in_time TIME,
  clock_out_time TIME,
  total_hours NUMERIC,
  break_hours NUMERIC,
  effective_hours NUMERIC,
  coffee_breaks INT,
  wc_breaks INT,
  lunch_breaks INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(a.clock_in_at) as work_date,
    a.clock_in_at::TIME as clock_in_time,
    a.clock_out_at::TIME as clock_out_time,
    ROUND(EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600::NUMERIC, 2) as total_hours,
    ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 3600), 0)::NUMERIC, 2) as break_hours,
    ROUND((EXTRACT(EPOCH FROM (COALESCE(a.clock_out_at, NOW()) - a.clock_in_at)) / 3600 - 
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(b.ended_at, NOW()) - b.started_at)) / 3600), 0))::NUMERIC, 2) as effective_hours,
    COUNT(CASE WHEN b.type = 'coffee' THEN 1 END)::INT as coffee_breaks,
    COUNT(CASE WHEN b.type = 'wc' THEN 1 END)::INT as wc_breaks,
    COUNT(CASE WHEN b.type = 'lunch' THEN 1 END)::INT as lunch_breaks
  FROM public.attendance a
  LEFT JOIN public.breaks b ON b.attendance_id = a.id
  WHERE a.user_id = p_user_id
    AND DATE(a.clock_in_at) BETWEEN p_start_date AND p_end_date
  GROUP BY a.id, a.clock_in_at, a.clock_out_at
  ORDER BY work_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_daily_breakdown IS 'Get detailed day-by-day work breakdown for a user including breaks';

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_user_work_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_daily_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_xp_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_break_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_department_productivity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_daily_breakdown TO authenticated;
