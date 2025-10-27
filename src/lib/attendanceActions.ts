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

export const startBreak = async (userId: string, type: 'scheduled' | 'bathroom' = 'bathroom') => {
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      type,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
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
      status: 'completed',
    })
    .eq('id', activeBreakId)
    .is('ended_at', null)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('No active break found to end. It may have already been completed.');
  }

  return data;
};

export const startLunch = async (userId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .insert({
      user_id: userId,
      type: 'lunch',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const endLunch = async (userId: string, breakId?: string) => {
  return endBreak(userId, breakId);
};
