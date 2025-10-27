import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optional: a service role client for server-side privileged actions (use carefully)
export const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

export type BreakRequestRow = {
  id: string;
  employee_id: string;
  team_id: string;
  type: 'break' | 'lunch';
  state: 'requested' | 'approved' | 'active' | 'ended' | 'cancelled';
  requested_at: string;
  requested_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  forced_end?: boolean;
  force_ended_by?: string | null;
  force_ended_at?: string | null;
  metadata?: Record<string, any>;
};
