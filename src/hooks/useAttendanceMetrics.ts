import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

interface AttendanceMetrics {
  workedMinutes: number; // Total clocked in time
  effectiveMinutes: number; // Worked time - breaks
  coffeeMinutes: number;
  wcMinutes: number;
  lunchMinutes: number;
  totalBreakMinutes: number;
  streakDays: number;
}

const defaultMetrics: AttendanceMetrics = {
  workedMinutes: 0,
  effectiveMinutes: 0,
  coffeeMinutes: 0,
  wcMinutes: 0,
  lunchMinutes: 0,
  totalBreakMinutes: 0,
  streakDays: 0,
};

const minutesBetween = (start: string, end: string | null) => {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
};

export const useAttendanceMetrics = (userId: string | undefined) => {
  const [metrics, setMetrics] = useState<AttendanceMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!userId) {
      setMetrics(defaultMetrics);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const [attendanceResult, breaksResult, streakResult] = await Promise.all([
        supabase
          .from('attendance')
          .select('clock_in_at, clock_out_at')
          .eq('user_id', userId)
          .gte('clock_in_at', dayStart)
          .lte('clock_in_at', dayEnd),
        supabase
          .from('breaks')
          .select('type, started_at, ended_at, status')
          .eq('user_id', userId)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),
        supabase
          .from('attendance')
          .select('clock_in_at')
          .eq('user_id', userId)
          .order('clock_in_at', { ascending: false })
          .limit(60),
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      if (breaksResult.error) throw breaksResult.error;
      if (streakResult.error) throw streakResult.error;

      // Calculate total worked time (clocked in time)
      const workedMinutes = (attendanceResult.data ?? []).reduce((total, record) => {
        return total + minutesBetween(record.clock_in_at, record.clock_out_at);
      }, 0);

      // Calculate break times by type
      let coffeeMinutes = 0;
      let wcMinutes = 0;
      let lunchMinutes = 0;

      (breaksResult.data ?? []).forEach((record) => {
        if (record.started_at) {
          const duration = minutesBetween(record.started_at, record.ended_at);
          switch (record.type) {
            case 'coffee':
              coffeeMinutes += duration;
              break;
            case 'wc':
              wcMinutes += duration;
              break;
            case 'lunch':
              lunchMinutes += duration;
              break;
          }
        }
      });

      const totalBreakMinutes = coffeeMinutes + wcMinutes + lunchMinutes;
      const effectiveMinutes = Math.max(0, workedMinutes - totalBreakMinutes);

      // Calculate streak
      const attendanceByDay = new Set<string>();
      (streakResult.data ?? []).forEach((record) => {
        if (record.clock_in_at) {
          attendanceByDay.add(format(new Date(record.clock_in_at), 'yyyy-MM-dd'));
        }
      });

      let streakDays = 0;
      let cursor = startOfDay(new Date());
      while (attendanceByDay.has(format(cursor, 'yyyy-MM-dd'))) {
        streakDays += 1;
        cursor = subDays(cursor, 1);
      }

      setMetrics({ 
        workedMinutes, 
        effectiveMinutes,
        coffeeMinutes, 
        wcMinutes, 
        lunchMinutes, 
        totalBreakMinutes,
        streakDays 
      });
    } catch (error: any) {
      console.error('Failed to load attendance metrics:', error);
      toast({
        title: 'Error loading stats',
        description: error.message ?? 'Unable to calculate your attendance stats right now.',
        variant: 'destructive',
      });
      setMetrics(defaultMetrics);
    } finally {
      setLoading(false);
    }
  }, [toast, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('attendance-metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'breaks', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return { metrics, loading, refresh };
};
