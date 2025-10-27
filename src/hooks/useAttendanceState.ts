import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceState, AttendanceRecord, BreakRecord } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

export const useAttendanceState = (userId: string | undefined) => {
  const [state, setState] = useState<AttendanceState>('not_checked_in');
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [activeBreak, setActiveBreak] = useState<BreakRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCurrentState = async () => {
    if (!userId) {
      setState('not_checked_in');
      setCurrentAttendance(null);
      setActiveBreak(null);
      setLoading(false);
      return;
    }

    try {
      // Get today's attendance record
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('clock_in_at', `${today}T00:00:00`)
        .lte('clock_in_at', `${today}T23:59:59`)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attError) throw attError;

      if (!attendance) {
        setState('not_checked_in');
        setCurrentAttendance(null);
        setActiveBreak(null);
        return;
      }

      setCurrentAttendance(attendance);

      if (attendance.clock_out_at) {
        setState('checked_out');
        setActiveBreak(null);
        return;
      }

      // Check for active break
      const { data: breaks, error: breakError } = await supabase
        .from('breaks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (breakError) throw breakError;

      if (breaks) {
        setActiveBreak(breaks);
        setState(breaks.type === 'lunch' ? 'on_lunch' : 'on_break');
      } else {
        setActiveBreak(null);
        setState('checked_in');
      }
    } catch (error) {
      console.error('Error fetching attendance state:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentState();
  }, [userId]);

  // Real-time subscription for attendance changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setTimeout(() => fetchCurrentState(), 0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breaks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setTimeout(() => fetchCurrentState(), 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    state,
    currentAttendance,
    activeBreak,
    loading,
    refresh: fetchCurrentState,
  };
};
