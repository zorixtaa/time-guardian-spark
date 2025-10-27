import { supabase } from '@/integrations/supabase/client';

export const checkIn = async (userId: string) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: userId,
      clock_in_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const checkOut = async (attendanceId: string) => {
  const { data, error } = await supabase
    .from('attendance')
    .update({
      clock_out_at: new Date().toISOString(),
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

type BreakType = 'scheduled' | 'bathroom' | 'lunch';

export const requestBreak = async (userId: string, type: BreakType = 'bathroom') => {
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      requested_by: userId,
      type,
      status: 'requested',
      started_at: null,
      ended_at: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const cancelBreakRequest = async (userId: string, breakId: string, reason?: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      status: 'cancelled',
      ended_at: new Date().toISOString(),
      ended_by: userId,
      end_reason: reason ?? 'Cancelled by employee',
    })
    .eq('id', breakId)
    .eq('user_id', userId)
    .eq('status', 'requested')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('No pending request found to cancel.');
  }

  return data;
};

export const approveBreak = async (breakId: string, approverId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      status: 'approved',
    })
    .eq('id', breakId)
    .eq('status', 'requested')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('This break request is no longer awaiting approval.');
  }

  return data;
};

export const rejectBreak = async (breakId: string, approverId: string, reason?: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      status: 'rejected',
      end_reason: reason ?? 'Rejected by admin',
    })
    .eq('id', breakId)
    .eq('status', 'requested')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('This break request is no longer awaiting approval.');
  }

  return data;
};

export const startApprovedBreak = async (breakId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', breakId)
    .eq('status', 'approved')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('Break is not ready to start.');
  }

  return data;
};

const resolveActiveBreakId = async (userId: string, breakId?: string) => {
  if (breakId) {
    const { data: candidate, error: candidateError } = await supabase
      .from('breaks')
      .select('id, status, ended_at')
      .eq('id', breakId)
      .eq('user_id', userId)
      .maybeSingle<{ id: string; status: string; ended_at: string | null }>();

    if (candidateError) throw candidateError;

    if (candidate && candidate.status === 'active' && !candidate.ended_at) {
      return candidate.id;
    }
  }

  const { data, error } = await supabase
    .from('breaks')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw error;

  return data?.id ?? null;
};

export const endBreak = async (userId: string, breakId?: string) => {
  const activeBreakId = await resolveActiveBreakId(userId, breakId);

  if (!activeBreakId) {
    throw new Error('No active break found to end. It may have already been completed.');
  }

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: new Date().toISOString(),
      ended_by: userId,
      end_reason: null,
      status: 'completed',
    })
    .eq('id', activeBreakId)
    .eq('status', 'active')
    .is('ended_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('No active break found to end. It may have already been completed.');
  }

  return data;
};

export const forceEndBreak = async (breakId: string, adminId: string, reason?: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: new Date().toISOString(),
      ended_by: adminId,
      end_reason: reason ?? 'Force ended by admin',
      status: 'force_ended',
    })
    .eq('id', breakId)
    .in('status', ['approved', 'active'])
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('Unable to force end this break. It may have already completed.');
  }

  return data;
};

export const requestLunch = (userId: string) => requestBreak(userId, 'lunch');

export const cancelLunchRequest = (userId: string, breakId: string, reason?: string) =>
  cancelBreakRequest(userId, breakId, reason ?? 'Cancelled lunch request');

export const startLunch = (breakId: string) => startApprovedBreak(breakId);

export const endLunch = async (userId: string, breakId?: string) => endBreak(userId, breakId);
