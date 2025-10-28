import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AttendanceRecord, AttendanceState, BreakRecord } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

export const useAttendanceState = (userId: string | undefined) => {
  const [state, setState] = useState<AttendanceState>('not_checked_in');
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [activeBreaks, setActiveBreaks] = useState<BreakRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCurrentState = async () => {
    if (!userId) {
      setState('not_checked_in');
      setCurrentAttendance(null);
      setActiveBreaks([]);
      setLoading(false);
      return;
    }

    try {
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
        setActiveBreaks([]);
        return;
      }

      setCurrentAttendance(attendance);

      if (attendance.clock_out_at) {
        setState('checked_out');
        setActiveBreaks([]);
        return;
      }

      // Get all breaks for current attendance (active, pending, approved)
      const { data: breaks, error: breakError } = await supabase
        .from('breaks')
        .select('*')
        .eq('user_id', userId)
        .eq('attendance_id', attendance.id)
        .in('status', ['pending', 'approved', 'active'])
        .is('ended_at', null)
        .order('created_at', { ascending: false });

      if (breakError) throw breakError;

      const currentBreaks = (breaks ?? []) as BreakRecord[];
      setActiveBreaks(currentBreaks);

      // Determine state based on breaks
      // Only one break can be active at a time
      if (currentBreaks.length > 0) {
        const currentBreak = currentBreaks[0];
        switch (currentBreak.status) {
          case 'pending':
            // Show as checked in but with pending break
            setState('checked_in');
            break;
          case 'approved':
          case 'active':
            switch (currentBreak.type) {
              case 'lunch':
                setState('on_lunch_break');
                break;
              case 'wc':
                setState('on_wc_break');
                break;
              case 'coffee':
                setState('on_coffee_break');
                break;
              default:
                setState('checked_in');
            }
            break;
          default:
            setState('checked_in');
        }
      } else {
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
        },
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    state,
    currentAttendance,
    activeBreaks,
    loading,
    refresh: fetchCurrentState,
  };
};
