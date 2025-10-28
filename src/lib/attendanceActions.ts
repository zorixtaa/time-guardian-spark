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

interface RequestBreakOptions {
  autoActivate?: boolean;
}

interface StartBreakOptions {
  allowPending?: boolean;
}

const isBreakNotReadyError = (error: any) => {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('not ready') || message.includes('no rows returned');
};

export const requestBreak = async (
  userId: string,
  type: BreakType = 'bathroom',
  options: RequestBreakOptions = {},
) => {
  const now = new Date().toISOString();

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

  let result = data;

  if (!error && data) {
    result = data;
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
    result = fallback.data;
  }

  if (!result) {
    if (error) throw error;
    throw new Error('Unable to create break request.');
  }

  if (!options.autoActivate) {
    return result;
  }

  try {
    const started = await startApprovedBreak(result.id, { allowPending: true });
    return started ?? result;
  } catch (startError: any) {
    if (isMissingColumnError(startError) || isConstraintViolation(startError)) {
      return result;
    }

    if (isBreakNotReadyError(startError)) {
      return result;
    }

    throw startError;
  }
};

export const cancelBreakRequest = async (userId: string, breakId: string, reason?: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      status: 'cancelled',
      ended_at: now,
      ended_by: userId,
      end_reason: reason ?? 'Cancelled by employee',
    })
    .eq('id', breakId)
    .eq('user_id', userId)
    .in('status', ['requested', 'pending'])
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        status: 'denied',
        ended_at: now,
      })
      .eq('id', breakId)
      .eq('user_id', userId)
      .in('status', ['requested', 'pending'])
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('No pending request found to cancel.');
    }

    return fallback.data;
  }

  if (error) throw error;

  if (!data) {
    throw new Error('No pending request found to cancel.');
  }

  return data;
};

export const approveBreak = async (breakId: string, approverId: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      approved_by: approverId,
      approved_at: now,
      status: 'approved',
    })
    .eq('id', breakId)
    .in('status', ['requested', 'pending'])
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        status: 'approved',
      })
      .eq('id', breakId)
      .in('status', ['requested', 'pending'])
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('This break request is no longer awaiting approval.');
    }

    return fallback.data;
  }

  if (error) throw error;

  if (!data) {
    throw new Error('This break request is no longer awaiting approval.');
  }

  return data;
};

export const rejectBreak = async (breakId: string, approverId: string, reason?: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      approved_by: approverId,
      approved_at: now,
      status: 'rejected',
      end_reason: reason ?? 'Rejected by admin',
    })
    .eq('id', breakId)
    .in('status', ['requested', 'pending'])
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        status: 'denied',
      })
      .eq('id', breakId)
      .in('status', ['requested', 'pending'])
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('This break request is no longer awaiting approval.');
    }

    return fallback.data;
  }

  if (error) throw error;

  if (!data) {
    throw new Error('This break request is no longer awaiting approval.');
  }

  return data;
};

export const startApprovedBreak = async (
  breakId: string,
  options: StartBreakOptions = {},
) => {
  const allowedStatuses = options.allowPending
    ? ['approved', 'requested', 'pending']
    : ['approved'];

  const { data, error } = await supabase
    .from('breaks')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', breakId)
    .in('status', allowedStatuses)
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        started_at: new Date().toISOString(),
      })
      .eq('id', breakId)
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('Break is not ready to start.');
    }

    return fallback.data;
  }

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

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      ended_by: userId,
      end_reason: null,
      status: 'completed',
    })
    .eq('id', activeBreakId)
    .eq('status', 'active')
    .is('ended_at', null)
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        ended_at: now,
        status: 'completed',
      })
      .eq('id', activeBreakId)
      .eq('status', 'active')
      .is('ended_at', null)
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('No active break found to end. It may have already been completed.');
    }

    return fallback.data;
  }

  if (error) throw error;

  if (!data) {
    throw new Error('No active break found to end. It may have already been completed.');
  }

  return data;
};

export const forceEndBreak = async (breakId: string, adminId: string, reason?: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      ended_by: adminId,
      end_reason: reason ?? 'Force ended by admin',
      status: 'force_ended',
    })
    .eq('id', breakId)
    .in('status', ['approved', 'active'])
    .select()
    .maybeSingle();

  if (error && (isMissingColumnError(error) || isConstraintViolation(error))) {
    const fallback = await supabase
      .from('breaks')
      .update({
        ended_at: now,
        status: 'completed',
      })
      .eq('id', breakId)
      .in('status', ['approved', 'active'])
      .select()
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    if (!fallback.data) {
      throw new Error('Unable to force end this break. It may have already completed.');
    }

    return fallback.data;
  }

  if (error) throw error;

  if (!data) {
    throw new Error('Unable to force end this break. It may have already completed.');
  }

  return data;
};

export const requestLunch = (userId: string, options: RequestBreakOptions = {}) =>
  requestBreak(userId, 'lunch', options);

export const cancelLunchRequest = (userId: string, breakId: string, reason?: string) =>
  cancelBreakRequest(userId, breakId, reason ?? 'Cancelled lunch request');

export const startLunch = (breakId: string, options: StartBreakOptions = {}) =>
  startApprovedBreak(breakId, options);

export const endLunch = async (userId: string, breakId?: string) => endBreak(userId, breakId);
