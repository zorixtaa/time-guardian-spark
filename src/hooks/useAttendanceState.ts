import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AttendanceRecord, AttendanceState, BreakRecord } from '@/types/attendance';
import { useToast } from '@/hooks/use-toast';

const OPEN_BREAK_STATUSES: ReadonlyArray<BreakRecord['status']> = [
  'pending',
  'approved',
  'active',
];

export const useAttendanceState = (userId: string | undefined) => {
  const [state, setState] = useState<AttendanceState>('not_checked_in');
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [activeBreak, setActiveBreak] = useState<BreakRecord | null>(null);
  const [activeLunch, setActiveLunch] = useState<BreakRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCurrentState = async () => {
    if (!userId) {
      setState('not_checked_in');
      setCurrentAttendance(null);
      setActiveBreak(null);
      setActiveLunch(null);
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
        setActiveBreak(null);
        setActiveLunch(null);
        return;
      }

      setCurrentAttendance(attendance);

      if (attendance.clock_out_at) {
        setState('checked_out');
        setActiveBreak(null);
        setActiveLunch(null);
        return;
      }

      const { data: breaks, error: breakError } = await supabase
        .from('breaks')
        .select('*')
        .eq('user_id', userId)
        .in('status', Array.from(OPEN_BREAK_STATUSES))
        .is('ended_at', null)
        .order('created_at', { ascending: false });

      if (breakError) throw breakError;

      const openBreaks = (breaks ?? []) as BreakRecord[];
      const priority: Record<string, number> = { active: 0, approved: 1, requested: 2, pending: 2 };

      const sortedBreaks = [...openBreaks].sort((a, b) => {
        const priorityDelta = (priority[a.status] ?? 10) - (priority[b.status] ?? 10);

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        const aTime = a.started_at ?? a.created_at;
        const bTime = b.started_at ?? b.created_at;

        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      const currentLunch = sortedBreaks.find((record) => record.type === 'lunch') ?? null;
      const currentBreak = sortedBreaks.find((record) => record.type !== 'lunch') ?? null;

      setActiveLunch(currentLunch);
      setActiveBreak(currentBreak);

      if (currentLunch) {
        if (currentLunch.status === 'active') {
          setState('on_lunch');
        } else if (currentLunch.status === 'approved') {
          setState('lunch_approved');
        } else if (currentLunch.status === 'pending') {
          setState('lunch_requested');
        } else {
          setState('checked_in');
        }

        return;
      }

      if (currentBreak) {
        if (currentBreak.status === 'active') {
          setState('on_break');
        } else if (currentBreak.status === 'approved') {
          setState('break_approved');
        } else if (currentBreak.status === 'pending') {
          setState('break_requested');
        } else {
          setState('checked_in');
        }

        return;
      }

      setState('checked_in');
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
    activeBreak,
    activeLunch,
    loading,
    refresh: fetchCurrentState,
  };
};
