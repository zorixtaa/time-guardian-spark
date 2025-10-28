import { supabase } from '@/integrations/supabase/client';
import type { BreakType } from '@/types/attendance';

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
  // First, end any active breaks
  const { data: activeBreaks } = await supabase
    .from('breaks')
    .select('id')
    .eq('attendance_id', attendanceId)
    .eq('status', 'active')
    .is('ended_at', null);

  if (activeBreaks && activeBreaks.length > 0) {
    const now = new Date().toISOString();
    await supabase
      .from('breaks')
      .update({ ended_at: now, status: 'completed' })
      .in('id', activeBreaks.map(b => b.id));
  }

  // Then check out
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

/**
 * Toggle an instant break - starts if not active, ends if active
 */
export const toggleInstantBreak = async (
  userId: string, 
  attendanceId: string, 
  breakType: BreakType
) => {
  // Check if there's an active break of this type
  const { data: activeBreak } = await supabase
    .from('breaks')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_id', attendanceId)
    .eq('type', breakType)
    .eq('status', 'active')
    .is('ended_at', null)
    .maybeSingle();

  if (activeBreak) {
    // End the active break
    const { data, error } = await supabase
      .from('breaks')
      .update({
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', activeBreak.id)
      .select()
      .single();

    if (error) throw error;
    return { action: 'ended' as const, data };
  } else {
    // Start a new break
    const { data, error } = await supabase
      .from('breaks')
      .insert({
        user_id: userId,
        attendance_id: attendanceId,
        type: breakType,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { action: 'started' as const, data };
  }
};

/**
 * Get active break for a specific type
 */
export const getActiveBreak = async (userId: string, attendanceId: string, breakType: BreakType) => {
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_id', attendanceId)
    .eq('type', breakType)
    .eq('status', 'active')
    .is('ended_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Get all active breaks for current attendance
 */
export const getAllActiveBreaks = async (userId: string, attendanceId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_id', attendanceId)
    .eq('status', 'active')
    .is('ended_at', null);

  if (error) throw error;
  return data || [];
};

/**
 * End all active breaks (used when checking out)
 */
export const endAllActiveBreaks = async (attendanceId: string) => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
    })
    .eq('attendance_id', attendanceId)
    .eq('status', 'active')
    .is('ended_at', null)
    .select();

  if (error) throw error;
  return data;
};

// Admin functions for forcing break end
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
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('Unable to force end this break. It may have already completed.');
  }

  return data;
};
