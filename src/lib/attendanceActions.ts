import { supabase } from '@/integrations/supabase/client';

const isMissingColumnError = (error: any) => {
  if (!error) return false;
  if (error.code === '42703') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('column') && message.includes('does not exist');
};

const isConstraintViolation = (error: any) => {
  if (!error) return false;
  if (error.code === '23514') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('violates check constraint') || message.includes('invalid input value for enum');
};

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

type BreakType = 'scheduled' | 'bathroom' | 'lunch' | 'emergency';

export const requestBreak = async (userId: string, type: BreakType = 'bathroom') => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      type,
      status: 'pending',
      started_at: null,
      ended_at: null,
    })
    .select()
    .single();

  if (!error && data) {
    return data;
  }

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .insert({
        user_id: userId,
        type,
        status: 'active',
        started_at: now,
      })
      .select()
      .single();

    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  if (error) throw error;
  throw new Error('Unable to create break request.');
};

export const cancelBreakRequest = async (userId: string, breakId: string, reason?: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      status: 'denied',
      ended_at: now,
      reason: reason ?? 'Cancelled by employee',
    })
    .eq('id', breakId)
    .eq('user_id', userId)
    .eq('status', 'pending')
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
      status: 'approved',
    })
    .eq('id', breakId)
    .eq('status', 'pending')
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
      status: 'denied',
      reason: reason ?? 'Rejected by admin',
    })
    .eq('id', breakId)
    .eq('status', 'pending')
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
    .in('status', ['approved'])
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
    .select('id, started_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; started_at: string | null }>();

  if (error) throw error;

  // Primary path: explicit active status
  if (data?.id) {
    return data.id;
  }

  // Fallback: some legacy schemas may not update status to 'active'
  // once started. Try any open record with a non-null started_at.
  const { data: fallback, error: fallbackError } = await supabase
    .from('breaks')
    .select('id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .not('started_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (fallbackError) throw fallbackError;

  return fallback?.id ?? null;
};

export const endBreak = async (userId: string, breakId?: string) => {
  const activeBreakId = await resolveActiveBreakId(userId, breakId);

  if (!activeBreakId) {
    throw new Error('No active break found to end. It may have already been completed.');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
    })
    .eq('id', activeBreakId)
    .in('status', ['active', 'approved'])
    .is('ended_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // Fallback for legacy schemas where status might be unchanged
    const { data: fallback, error: fallbackError } = await supabase
      .from('breaks')
      .update({ ended_at: now, status: 'completed' })
      .eq('id', activeBreakId)
      .is('ended_at', null)
      .select()
      .maybeSingle();

    if (fallbackError) throw fallbackError;

    if (!fallback) {
      throw new Error('No active break found to end. It may have already been completed.');
    }

    return fallback;
  }

  return data;
};

export const forceEndBreak = async (breakId: string, adminId: string, reason?: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
      reason: reason ?? 'Force ended by admin',
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
