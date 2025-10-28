export type AttendanceState =
  | 'not_checked_in'
  | 'checked_in'
  | 'break_requested'
  | 'break_approved'
  | 'on_break'
  | 'lunch_requested'
  | 'lunch_approved'
  | 'on_lunch'
  | 'checked_out';

export type BreakStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'denied'
  | 'completed';

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
  type: 'scheduled' | 'bathroom' | 'lunch' | 'emergency';
  status: BreakStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  approved_by?: string | null;
  shift_id: string | null;
  reason: string | null;
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
