import { supabase } from '@/integrations/supabase/client';
import type { BreakType } from '@/types/attendance';

// ============================================================================
// ANALYTICS & REPORTING FUNCTIONS
// ============================================================================

// Types for analytics data
export interface UserWorkSummary {
  total_days_worked: number;
  total_hours_clocked: number;
  total_break_hours: number;
  effective_work_hours: number;
  coffee_break_count: number;
  wc_break_count: number;
  lunch_break_count: number;
  avg_daily_hours: number;
}

export interface TeamDailyStats {
  total_members_checked_in: number;
  currently_active: number;
  on_coffee_break: number;
  on_wc_break: number;
  on_lunch_break: number;
  total_hours_worked: number;
  avg_hours_per_person: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  team_name: string;
  total_xp: number;
  level: number;
  rank: number;
}

export interface StreakEntry {
  user_id: string;
  display_name: string;
  team_name: string;
  current_streak: number;
  rank: number;
}

export interface BreakStatistics {
  break_type: BreakType;
  total_breaks: number;
  total_minutes: number;
  avg_duration_minutes: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
}

export interface ActivityLogEntry {
  activity_id: string;
  user_id: string;
  user_name: string;
  activity_type: string;
  activity_description: string;
  occurred_at: string;
  metadata: Record<string, any>;
}

export interface DepartmentProductivity {
  team_id: string | null;
  team_name: string;
  total_members: number;
  avg_hours_per_member: number;
  avg_effective_hours: number;
  total_breaks: number;
  attendance_rate: number;
}

export interface DailyBreakdown {
  work_date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number;
  break_hours: number;
  effective_hours: number;
  coffee_breaks: number;
  wc_breaks: number;
  lunch_breaks: number;
}

// ============================================================================
// 1. USER WORK SUMMARY
// ============================================================================
/**
 * Get comprehensive work statistics for a user within a date range
 * @param userId - User ID to get stats for
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @returns Work summary including hours worked, breaks, and averages
 */
export const getUserWorkSummary = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserWorkSummary> => {
  const { data, error } = await supabase.rpc('get_user_work_summary', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data?.[0] || {
    total_days_worked: 0,
    total_hours_clocked: 0,
    total_break_hours: 0,
    effective_work_hours: 0,
    coffee_break_count: 0,
    wc_break_count: 0,
    lunch_break_count: 0,
    avg_daily_hours: 0,
  };
};

// ============================================================================
// 2. TEAM DAILY STATISTICS
// ============================================================================
/**
 * Get real-time statistics for a team on a specific date
 * @param teamId - Team ID (null for unassigned members)
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Daily team statistics
 */
export const getTeamDailyStats = async (
  teamId?: string | null,
  date?: string
): Promise<TeamDailyStats> => {
  const { data, error } = await supabase.rpc('get_team_daily_stats', {
    p_team_id: teamId || null,
    p_date: date || new Date().toISOString().split('T')[0],
  });

  if (error) throw error;
  return data?.[0] || {
    total_members_checked_in: 0,
    currently_active: 0,
    on_coffee_break: 0,
    on_wc_break: 0,
    on_lunch_break: 0,
    total_hours_worked: 0,
    avg_hours_per_person: 0,
  };
};

// ============================================================================
// 3. XP LEADERBOARD
// ============================================================================
/**
 * Get top users by XP with ranking
 * @param limit - Maximum number of entries to return (default 10)
 * @param teamId - Filter by team ID (optional)
 * @returns Array of leaderboard entries
 */
export const getXpLeaderboard = async (
  limit = 10,
  teamId?: string | null
): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase.rpc('get_xp_leaderboard', {
    p_limit: limit,
    p_team_id: teamId || null,
  });

  if (error) throw error;
  return data || [];
};

// ============================================================================
// 4. ATTENDANCE STREAK LEADERBOARD
// ============================================================================
/**
 * Get users with the longest current attendance streaks
 * @param limit - Maximum number of entries to return (default 10)
 * @param teamId - Filter by team ID (optional)
 * @returns Array of streak entries
 */
export const getStreakLeaderboard = async (
  limit = 10,
  teamId?: string | null
): Promise<StreakEntry[]> => {
  const { data, error } = await supabase.rpc('get_streak_leaderboard', {
    p_limit: limit,
    p_team_id: teamId || null,
  });

  if (error) throw error;
  return data || [];
};

// ============================================================================
// 5. BREAK STATISTICS
// ============================================================================
/**
 * Get detailed break duration statistics for a user
 * @param userId - User ID to get stats for
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @returns Array of break statistics by type
 */
export const getBreakStatistics = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<BreakStatistics[]> => {
  const { data, error } = await supabase.rpc('get_break_statistics', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return (data || []) as any;
};

// ============================================================================
// 6. RECENT ACTIVITY LOG
// ============================================================================
/**
 * Get recent activity across the system for admin monitoring
 * @param teamId - Filter by team ID (optional)
 * @param limit - Maximum number of entries to return (default 50)
 * @returns Array of activity log entries
 */
export const getRecentActivity = async (
  teamId?: string | null,
  limit = 50
): Promise<ActivityLogEntry[]> => {
  const { data, error } = await supabase.rpc('get_recent_activity', {
    p_team_id: teamId || null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data || []) as ActivityLogEntry[];
};

// ============================================================================
// 7. DEPARTMENT PRODUCTIVITY COMPARISON
// ============================================================================
/**
 * Compare productivity metrics across departments
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of department productivity metrics
 */
export const getDepartmentProductivity = async (
  startDate: string,
  endDate: string
): Promise<DepartmentProductivity[]> => {
  const { data, error } = await supabase.rpc('get_department_productivity', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data || [];
};

// ============================================================================
// 8. USER DAILY BREAKDOWN
// ============================================================================
/**
 * Get detailed day-by-day breakdown for a user
 * @param userId - User ID to get breakdown for
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of daily work breakdowns
 */
export const getUserDailyBreakdown = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyBreakdown[]> => {
  const { data, error } = await supabase.rpc('get_user_daily_breakdown', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data || [];
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date range for common periods
 */
export const getDateRange = (period: 'today' | 'week' | 'month' | 'year') => {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      start = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
  }

  return {
    start: start.toISOString(),
    end,
  };
};

/**
 * Format hours to readable string
 */
export const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

/**
 * Calculate efficiency percentage (effective hours / total hours)
 */
export const calculateEfficiency = (
  effectiveHours: number,
  totalHours: number
): number => {
  if (totalHours === 0) return 0;
  return Math.round((effectiveHours / totalHours) * 100);
};
