import { supabase } from '@/integrations/supabase/client';
import type { BreakType, BreakEntitlements, BreakEligibility, EntitlementNotification } from '@/types/attendance';

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
 * Request a break - requires admin approval unless team availability is low
 * Now includes timing and entitlement checks
 */
export const requestBreak = async (
  userId: string, 
  attendanceId: string, 
  breakType: BreakType,
  teamId?: string | null
) => {
  // Use the database function to request break (includes all checks)
  const { data, error } = await supabase.rpc('request_break', {
    p_user_id: userId,
    p_attendance_id: attendanceId,
    p_break_type: breakType,
    p_team_id: teamId || null
  });

  if (error) throw error;
  
  const result = data as any; // Cast from Json to object
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to request break');
  }

  return {
    action: result.instant_approval ? 'started' as const : 'requested' as const,
    data: { id: result.break_id, status: result.status },
    instantApproval: result.instant_approval,
    workDurationMinutes: result.work_duration_minutes || 0,
    microBreakRemaining: result.micro_break_remaining || 30,
    lunchBreakRemaining: result.lunch_break_remaining || 60
  };
};

/**
 * Start an approved break - user clicks the "Leave Position?" button
 */
export const startApprovedBreak = async (breakId: string, userId: string) => {
  const { data, error } = await supabase.rpc('start_approved_break', {
    p_break_id: breakId,
    p_user_id: userId
  });

  if (error) throw error;
  
  const result = data as any;
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to start break');
  }

  return result;
};

/**
 * End an active break
 */
export const endBreak = async (breakId: string) => {
  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', breakId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw error;
  return { action: 'ended' as const, data };
};

/**
 * Toggle a break - requests if none active, ends if active
 */
export const toggleBreak = async (
  userId: string, 
  attendanceId: string, 
  breakType: BreakType,
  teamId?: string | null
) => {
  // Check if there's an active break
  const { data: activeBreak } = await supabase
    .from('breaks')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_id', attendanceId)
    .eq('status', 'active')
    .is('ended_at', null)
    .maybeSingle();

  if (activeBreak) {
    // End the active break
    return await endBreak(activeBreak.id);
  } else {
    // Request a new break
    return await requestBreak(userId, attendanceId, breakType, teamId);
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

// Admin functions for managing break requests
export const approveBreak = async (breakId: string, adminId: string) => {
  const { data, error } = await supabase.rpc('approve_break', {
    p_break_id: breakId,
    p_admin_id: adminId
  });

  if (error) throw error;
  
  const result = data as any;
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to approve break');
  }

  return result;
};

export const denyBreak = async (breakId: string, adminId: string, reason?: string) => {
  const { data, error } = await supabase.rpc('deny_break', {
    p_break_id: breakId,
    p_admin_id: adminId,
    p_reason: reason || null
  });

  if (error) throw error;
  
  const result = data as any;
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to deny break');
  }

  return result;
};

export const getPendingBreakRequests = async (adminTeamId?: string | null) => {
  const { data, error } = await supabase.rpc('get_pending_break_requests', {
    p_admin_team_id: adminTeamId || null
  });

  if (error) throw error;
  return data || [];
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

// Break entitlement functions
export const getDailyBreakEntitlements = async (userId: string, date?: string): Promise<BreakEntitlements> => {
  const { data, error } = await supabase.rpc('get_daily_break_entitlements', {
    p_user_id: userId,
    p_date: date || new Date().toISOString().split('T')[0]
  });

  if (error) throw error;
  return data[0];
};

export const checkBreakEligibility = async (
  userId: string, 
  attendanceId: string, 
  breakType: BreakType,
  date?: string
): Promise<BreakEligibility> => {
  const { data, error } = await supabase.rpc('can_request_break', {
    p_user_id: userId,
    p_attendance_id: attendanceId,
    p_break_type: breakType,
    p_date: date || new Date().toISOString().split('T')[0]
  });

  if (error) throw error;
  
  const result = data as any;
  return {
    can_request: result.can_request || false,
    reason: result.reason || '',
    work_duration_minutes: result.work_duration_minutes || 0,
    micro_break_remaining: result.micro_break_remaining || 30,
    lunch_break_remaining: result.lunch_break_remaining || 60
  };
};

export const getEntitlementNotifications = async (adminTeamId?: string | null): Promise<EntitlementNotification[]> => {
  const { data, error } = await supabase.rpc('get_entitlement_notifications', {
    p_admin_team_id: adminTeamId || null
  });

  if (error) throw error;
  return (data || []) as EntitlementNotification[];
};

export const acknowledgeEntitlementNotification = async (notificationId: string, adminId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('acknowledge_entitlement_notification', {
    p_notification_id: notificationId,
    p_admin_id: adminId
  });

  if (error) throw error;
  return Boolean(data);
};
