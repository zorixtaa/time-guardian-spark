import { supabase } from '@/integrations/supabase/client';

interface LogActivity {
  action: string;
  details: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs all user actions to the console and optionally to the database
 * This ensures comprehensive audit trail of all system activities
 */
export const logActivity = async ({
  action,
  details,
  userId,
  metadata = {}
}: LogActivity): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  // Always log to console for debugging
  console.log('[ACTIVITY LOG]', {
    timestamp,
    action,
    userId,
    details,
    metadata,
  });

  // Optionally log to database if needed (commented out for now)
  // try {
  //   await supabase.from('activity_logs').insert({
  //     timestamp,
  //     action,
  //     user_id: userId,
  //     details: JSON.stringify(details),
  //     metadata: JSON.stringify(metadata),
  //   });
  // } catch (error) {
  //   console.error('[ACTIVITY LOG] Failed to log to database:', error);
  // }
};

/**
 * Logs authentication events
 */
export const logAuth = (action: 'sign_in' | 'sign_out' | 'sign_up', userId?: string, email?: string) => {
  logActivity({
    action: `auth.${action}`,
    details: { email },
    userId,
    metadata: { timestamp: Date.now() }
  });
};

/**
 * Logs attendance events
 */
export const logAttendance = (
  action: 'check_in' | 'check_out',
  userId: string,
  attendanceId?: string,
  details?: Record<string, any>
) => {
  logActivity({
    action: `attendance.${action}`,
    details: { attendanceId, ...details },
    userId,
    metadata: { timestamp: Date.now() }
  });
};

/**
 * Logs break events (currently disabled but logged for audit)
 */
export const logBreak = (
  action: 'request' | 'approve' | 'deny' | 'start' | 'end' | 'force_end',
  breakType: string,
  userId: string,
  breakId?: string,
  details?: Record<string, any>
) => {
  logActivity({
    action: `break.${action}`,
    details: { breakType, breakId, ...details },
    userId,
    metadata: { 
      timestamp: Date.now(),
      status: 'BREAKS_DISABLED' // Mark that breaks are currently disabled
    }
  });
};

/**
 * Logs admin actions
 */
export const logAdmin = (
  action: string,
  adminId: string,
  targetUserId?: string,
  details?: Record<string, any>
) => {
  logActivity({
    action: `admin.${action}`,
    details: { targetUserId, ...details },
    userId: adminId,
    metadata: { timestamp: Date.now(), role: 'admin' }
  });
};
