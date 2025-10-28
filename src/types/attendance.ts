export type AttendanceState =
  | 'not_checked_in'
  | 'checked_in'
  | 'on_coffee_break'
  | 'on_wc_break'
  | 'on_lunch_break'
  | 'checked_out';

export type BreakType = 'coffee' | 'wc' | 'lunch';

export type BreakStatus = 'pending' | 'approved' | 'denied' | 'active' | 'completed';

export type UserRole = 'employee' | 'admin' | 'super_admin';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  shift_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BreakRecord {
  id: string;
  user_id: string;
  type: BreakType;
  status: BreakStatus;
  started_at: string | null;
  ended_at: string | null;
  attendance_id: string | null;
  team_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  created_at: string;
  reason: string | null;
  updated_at: string;
}

export interface DailyMetrics {
  worked_time: number; // minutes
  break_time: number; // minutes
  lunch_time: number; // minutes
  on_time_streak: number; // days
  perfect_streak: number; // days
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  points: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  awarded_by: string | null;
  reason: string | null;
  badge?: Badge;
}

export interface XPRecord {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  created_at: string;
}
