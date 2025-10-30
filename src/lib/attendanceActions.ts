import { supabase } from '@/integrations/supabase/client';
import { isLegacyBreakTypeError, normalizeBreakType } from '@/lib/breakType';
import type {
  BreakType,
  BreakStatus,
  BreakEntitlements,
  BreakEligibility,
  BreakRecord,
  EntitlementNotification,
} from '@/types/attendance';

interface RequestBreakResponse {
  success: boolean;
  break_id?: string;
  instant_approval?: boolean;
  status?: BreakStatus;
  work_duration_minutes?: number | null;
  micro_break_remaining?: number | null;
  lunch_break_remaining?: number | null;
  error?: string;
}

interface StartApprovedBreakResponse {
  success: boolean;
  break_id?: string;
  started_at?: string;
  error?: string;
}

interface BreakApprovalResponse {
  success: boolean;
  error?: string;
}

interface BreakEligibilityResponse {
  can_request?: boolean;
  reason?: string;
  work_duration_minutes?: number | null;
  micro_break_remaining?: number | null;
  lunch_break_remaining?: number | null;
}

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
    await Promise.all(
      activeBreaks.map(async (breakRecord) => {
        await endBreak(breakRecord.id);
      })
    );
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

  const result = data as unknown as RequestBreakResponse;

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to request break');
  }

  const breakId = result.break_id;
  if (!breakId) {
    throw new Error('Break request completed without an identifier');
  }

  return {
    action: result.instant_approval ? ('started' as const) : ('requested' as const),
    data: {
      id: breakId,
      status: (result.status ?? 'pending') as BreakStatus,
    },
    instantApproval: Boolean(result.instant_approval),
    workDurationMinutes: result.work_duration_minutes ?? 0,
    microBreakRemaining: result.micro_break_remaining ?? 30,
    lunchBreakRemaining: result.lunch_break_remaining ?? 60,
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

  const result = data as unknown as StartApprovedBreakResponse;

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to start break');
  }

  return result;
};

/**
 * End an active break
 */
export const endBreak = async (breakId: string) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
    })
    .eq('id', breakId)
    .eq('status', 'active')
    .select()
    .single();

  if (!error) {
    return { action: 'ended' as const, data };
  }

  if (!isLegacyBreakTypeError(error)) {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
      type: 'coffee',
    })
    .eq('id', breakId)
    .eq('status', 'active')
    .select()
    .single();

  if (fallbackError) {
    throw fallbackError;
  }

  return { action: 'ended' as const, data: fallbackData };
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
    .eq('status', 'active')
    .is('ended_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rawBreaks = (data ?? []) as Array<Omit<BreakRecord, 'type'> & { type?: string | null }>;
  return (rawBreaks.find(record => normalizeBreakType(record.type) === breakType) as BreakRecord | undefined) ?? null;
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
  const rawBreaks = (data ?? []) as Array<Omit<BreakRecord, 'type'> & { type?: string | null }>;
  return rawBreaks.map(record => ({
    ...record,
    type: normalizeBreakType(record.type),
  })) as BreakRecord[];
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

  if (!error) {
    return data;
  }

  if (!isLegacyBreakTypeError(error)) {
    throw error;
  }

  const { data: activeBreaks } = await supabase
    .from('breaks')
    .select('id')
    .eq('attendance_id', attendanceId)
    .eq('status', 'active')
    .is('ended_at', null);

  const breakIds = activeBreaks?.map(record => record.id) ?? [];
  const results = await Promise.all(breakIds.map(async (breakId: string) => {
    const result = await endBreak(breakId);
    return result.data;
  }));

  return results;
};

// Admin functions for managing break requests
export const approveBreak = async (breakId: string, adminId: string) => {
  const { data, error } = await supabase.rpc('approve_break', {
    p_break_id: breakId,
    p_admin_id: adminId
  });

  if (error) throw error;

  const result = data as unknown as BreakApprovalResponse;

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to approve break');
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

  const result = data as unknown as BreakApprovalResponse;

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to deny break');
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

  if (!error) {
    if (!data) {
      throw new Error('Unable to force end this break. It may have already completed.');
    }
    return data;
  }

  if (!isLegacyBreakTypeError(error)) {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('breaks')
    .update({
      ended_at: now,
      status: 'completed',
      reason: reason ?? 'Force ended by admin',
      type: 'coffee',
    })
    .eq('id', breakId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  if (!fallbackData) {
    throw new Error('Unable to force end this break. It may have already completed.');
  }

  return fallbackData;
};

// Break entitlement functions
export const getDailyBreakEntitlements = async (userId: string, date?: string): Promise<BreakEntitlements> => {
  const { data, error } = await supabase.rpc('get_daily_break_entitlements', {
    p_user_id: userId,
    p_date: date || new Date().toISOString().split('T')[0]
  });

  if (error) throw error;
  const firstRow = Array.isArray(data) ? data[0] : null;
  if (!firstRow) {
    throw new Error('No entitlement data returned');
  }
  return firstRow as BreakEntitlements;
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
  
  const result = data as BreakEligibilityResponse | null;
  return {
    can_request: Boolean(result?.can_request),
    reason: result?.reason ?? '',
    work_duration_minutes: result?.work_duration_minutes ?? 0,
    micro_break_remaining: result?.micro_break_remaining ?? 30,
    lunch_break_remaining: result?.lunch_break_remaining ?? 60,
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
