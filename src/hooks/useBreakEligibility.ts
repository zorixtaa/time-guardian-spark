import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BreakType } from '@/types/attendance';

interface BreakEligibilityState {
  canRequestBreak: boolean;
  minutesUntilEligible: number;
  reason: string;
  isLoading: boolean;
}

export const useBreakEligibility = (
  userId: string | null,
  attendanceId: string | null,
  clockInTime: string | null
) => {
  const [eligibility, setEligibility] = useState<BreakEligibilityState>({
    canRequestBreak: false,
    minutesUntilEligible: 60,
    reason: 'You must be clocked in to take a break',
    isLoading: false,
  });

  useEffect(() => {
    if (!userId || !attendanceId || !clockInTime) {
      setEligibility({
        canRequestBreak: false,
        minutesUntilEligible: 60,
        reason: 'You must be clocked in to take a break',
        isLoading: false,
      });
      return;
    }

    const checkEligibility = () => {
      const clockIn = new Date(clockInTime);
      const now = new Date();
      const minutesSinceClockIn = Math.floor((now.getTime() - clockIn.getTime()) / (1000 * 60));

      if (minutesSinceClockIn < 60) {
        const remaining = 60 - minutesSinceClockIn;
        setEligibility({
          canRequestBreak: false,
          minutesUntilEligible: remaining,
          reason: `You can take your first break in ${remaining} minute${remaining !== 1 ? 's' : ''}`,
          isLoading: false,
        });
      } else {
        setEligibility({
          canRequestBreak: true,
          minutesUntilEligible: 0,
          reason: '',
          isLoading: false,
        });
      }
    };

    checkEligibility();
    const interval = setInterval(checkEligibility, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [userId, attendanceId, clockInTime]);

  const checkBreakLimit = async (breakType: BreakType): Promise<{ allowed: boolean; reason: string }> => {
    if (!userId || !attendanceId) {
      return { allowed: false, reason: 'You must be clocked in to take a break' };
    }

    if (!eligibility.canRequestBreak) {
      return { allowed: false, reason: eligibility.reason };
    }

    // Get today's breaks
    const today = new Date().toISOString().split('T')[0];
    const { data: breaks, error } = await supabase
      .from('breaks')
      .select('type, started_at, ended_at')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .not('status', 'eq', 'denied');

    if (error) {
      console.error('Error checking break limits:', error);
      return { allowed: true, reason: '' };
    }

    // Calculate used time
    let microAndWcUsed = 0;
    let lunchUsed = 0;

    breaks?.forEach((b) => {
      if (!b.started_at) return;
      const start = new Date(b.started_at);
      const end = b.ended_at ? new Date(b.ended_at) : new Date();
      const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

      if (b.type === 'coffee' || b.type === 'wc') {
        microAndWcUsed += minutes;
      } else if (b.type === 'lunch') {
        lunchUsed += minutes;
      }
    });

    // Check limits
    if ((breakType === 'coffee' || breakType === 'wc') && microAndWcUsed >= 30) {
      return { 
        allowed: false, 
        reason: `You have used all 30 minutes of micro/WC breaks today (${microAndWcUsed} min used)` 
      };
    }

    if (breakType === 'lunch' && lunchUsed >= 60) {
      return { 
        allowed: false, 
        reason: `You have used all 60 minutes of lunch break today (${lunchUsed} min used)` 
      };
    }

    return { allowed: true, reason: '' };
  };

  return {
    ...eligibility,
    checkBreakLimit,
  };
};
