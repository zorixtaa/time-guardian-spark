import { supabase, supabaseService, BreakRequestRow } from './supabase';

export async function requestBreak({
  employeeId,
  teamId,
  type,
  notes,
}: {
  employeeId: string;
  teamId: string;
  type: 'break' | 'lunch';
  notes?: string;
}) {
  const { data, error } = await supabase
    .from<BreakRequestRow>('break_requests')
    .insert({
      employee_id: employeeId,
      team_id: teamId,
      type,
      state: 'requested',
      requested_notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveBreak({
  breakId,
  approverId,
}: {
  breakId: string;
  approverId: string;
}) {
  const { data, error } = await supabaseService
    .from<BreakRequestRow>('break_requests')
    .update({
      state: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function startBreak({ breakId }: { breakId: string }) {
  const { data, error } = await supabaseService
    .from<BreakRequestRow>('break_requests')
    .update({
      state: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endBreak({ breakId }: { breakId: string }) {
  const endedAt = new Date().toISOString();
  const { data, error } = await supabaseService
    .from<BreakRequestRow>('break_requests')
    .update({
      state: 'ended',
      ended_at: endedAt,
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelBreak({ breakId }: { breakId: string }) {
  const { data, error } = await supabaseService
    .from<BreakRequestRow>('break_requests')
    .update({
      state: 'cancelled',
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function forceEndBreak({ breakId, actorId }: { breakId: string; actorId: string }) {
  const endedAt = new Date().toISOString();
  const { data, error } = await supabaseService
    .from<BreakRequestRow>('break_requests')
    .update({
      state: 'ended',
      forced_end: true,
      force_ended_by: actorId,
      force_ended_at: endedAt,
      ended_at: endedAt,
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Realtime subscription for admin dashboards
export function subscribeToBreakRequests({
  teamId,
  callback,
}: {
  teamId: string;
  callback: (payload: any) => void;
}) {
  return supabase
    .channel(`public:break_requests:team=${teamId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'break_requests', filter: `team_id=eq.${teamId}` },
      (payload) => callback(payload)
    )
    .subscribe();
}