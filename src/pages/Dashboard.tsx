import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendanceState } from '@/hooks/useAttendanceState';
import { useAttendanceMetrics } from '@/hooks/useAttendanceMetrics';
import { useXpSystem } from '@/hooks/useXpSystem';
import { StateIndicator } from '@/components/attendance/StateIndicator';
import { ActionButtons } from '@/components/attendance/ActionButtons';
import {
  checkIn,
  checkOut,
  requestBreak,
  cancelBreakRequest,
  startApprovedBreak,
  endBreak,
  requestLunch,
  cancelLunchRequest,
  startLunch,
  endLunch,
} from '@/lib/attendanceActions';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Clock, Coffee, Utensils, Target } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { UserRole } from '@/types/attendance';
import { XpProgress } from '@/components/xp/XpProgress';

const formatHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

const formatDaysLabel = (days: number) => {
  const suffix = days === 1 ? 'day' : 'days';
  return `${days} ${suffix}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('employee');
  const [roleLoading, setRoleLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const {
    state,
    currentAttendance,
    activeBreak,
    activeLunch,
    refresh,
    loading: attendanceLoading,
  } = useAttendanceState(user?.id);
  const {
    metrics,
    loading: metricsLoading,
    refresh: refreshMetrics,
  } = useAttendanceMetrics(user?.id);
  const xpState = useXpSystem(user?.id);

  const fetchUserRole = useCallback(
    async (userId: string) => {
      setRoleLoading(true);
      try {
        const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase.from('profiles').select('team_id').eq('id', userId).maybeSingle(),
        ]);

        if (roleError && roleError.code !== 'PGRST116') {
          throw roleError;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        setRole((roleData?.role as UserRole) ?? 'employee');
        setUserTeamId((profileData?.team_id as string | null) ?? null);
      } catch (error: any) {
        console.error('Error fetching user role:', error);
        toast({
          title: 'Unable to determine access level',
          description: 'Showing the employee dashboard for now.',
          variant: 'destructive',
        });
        setRole('employee');
        setUserTeamId(null);
      } finally {
        setRoleLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        void fetchUserRole(currentUser.id);
      } else {
        setRole('employee');
        setRoleLoading(false);
        navigate('/auth');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void fetchUserRole(nextUser.id);
      } else {
        setRole('employee');
        setRoleLoading(false);
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole, navigate]);

  const handleSignOut = async () => {
    if (state !== 'checked_out' && state !== 'not_checked_in') {
      toast({
        title: 'Check out required',
        description: 'Please end your shift before signing out.',
        variant: 'destructive',
      });
      return;
    }

    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await checkIn(user.id);
      toast({
        title: 'Checked In!',
        description: 'Your shift has started',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentAttendance) {
      toast({
        title: 'No active shift found',
        description: 'Please check in before attempting to check out.',
        variant: 'destructive',
      });
      return;
    }
    setActionLoading(true);
    try {
      await checkOut(currentAttendance.id);
      toast({
        title: 'Checked Out!',
        description: 'Have a great day!',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestBreak = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await requestBreak(user.id);
      toast({
        title: 'Break Requested',
        description: 'Waiting for approval…',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBreakRequest = async () => {
    if (!user || !activeBreak || activeBreak.status !== 'requested') {
      toast({
        title: 'No pending break request',
        description: 'Refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      await cancelBreakRequest(user.id, activeBreak.id);
      toast({
        title: 'Break Request Cancelled',
        description: 'You can request again anytime.',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateBreak = async () => {
    if (!activeBreak || activeBreak.status !== 'approved') {
      toast({
        title: 'Break not ready',
        description: 'Wait for approval before starting your break.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      await startApprovedBreak(activeBreak.id);
      toast({
        title: 'Break Started',
        description: 'Take your time!',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await endBreak(user.id, activeBreak?.id ?? undefined);
      toast({
        title: 'Break Ended',
        description: 'Welcome back!',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestLunch = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await requestLunch(user.id);
      toast({
        title: 'Lunch Requested',
        description: 'Waiting for approval…',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLunchRequest = async () => {
    if (!user || !activeLunch || activeLunch.status !== 'requested') {
      toast({
        title: 'No pending lunch request',
        description: 'Refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      await cancelLunchRequest(user.id, activeLunch.id);
      toast({
        title: 'Lunch Request Cancelled',
        description: 'You can request lunch again anytime.',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateLunch = async () => {
    if (!activeLunch || activeLunch.status !== 'approved') {
      toast({
        title: 'Lunch not ready',
        description: 'Wait for approval before starting lunch.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      await startLunch(activeLunch.id);
      toast({
        title: 'Lunch Started',
        description: 'Enjoy your meal!',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndLunch = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await endLunch(user.id, activeLunch?.id ?? undefined);
      toast({
        title: 'Lunch Ended',
        description: 'Back to work!',
      });
      await Promise.all([refresh(), refreshMetrics()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const derivedName = useMemo(() => {
    if (!user) return '';
    const metadata = user.user_metadata ?? {};
    const possibleName =
      (metadata.full_name as string | undefined) ||
      (metadata.display_name as string | undefined) ||
      (metadata.name as string | undefined) ||
      '';

    return (possibleName || user.email || '').toString();
  }, [user]);

  const isZouhair = useMemo(() => {
    const normalizedName = derivedName.toLowerCase();
    const normalizedEmail = (user?.email ?? '').toLowerCase();
    return normalizedName.includes('zouhair ouqaf') || normalizedEmail.includes('zouhair');
  }, [derivedName, user]);

  const effectiveRole = useMemo<UserRole>(() => {
    if (role === 'super_admin' || isZouhair) {
      return 'super_admin';
    }
    return role;
  }, [isZouhair, role]);

  const workedTodayDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.workedMinutes);
  const breakTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.breakMinutes);
  const streakDisplay = metricsLoading ? 'Calculating…' : formatDaysLabel(metrics.streakDays);
  const activeSessionRecord = state === 'on_lunch' ? activeLunch : state === 'on_break' ? activeBreak : null;

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-black/80">
        <div className="text-center text-foreground">
          <div className="w-16 h-16 border-4 border-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (effectiveRole === 'super_admin' || effectiveRole === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onSignOut={handleSignOut}
        role={effectiveRole}
        teamId={userTeamId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/80 text-foreground">
      <header className="border-b border-yellow/10 bg-black/40 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow/20 text-yellow">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-yellow/80">Personal Attendance</p>
              <h1 className="text-2xl font-semibold">Welcome back, {derivedName || user.email}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(xpState.loading || xpState.xpEnabled) && (
              <XpProgress
                loading={xpState.loading}
                level={xpState.level}
                totalXp={xpState.totalXp}
                progressPercentage={xpState.progressPercentage}
                xpToNextLevel={xpState.xpToNextLevel}
              />
            )}
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="gap-2 border-yellow/40 bg-yellow/10 text-yellow hover:bg-yellow/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-8 px-6 py-10">
        <Card className="border-yellow/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Current Status</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Your real-time attendance state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StateIndicator state={state} />

            {state === 'checked_in' && currentAttendance && (
              <div className="text-sm text-muted-foreground">
                Checked in at {new Date(currentAttendance.clock_in_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}

            {activeSessionRecord?.started_at && (
              <div className="text-sm text-muted-foreground">
                Started at {new Date(activeSessionRecord.started_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Manage your attendance with a tap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceLoading && (
              <p className="text-sm text-muted-foreground/80">
                Syncing your latest attendance so the right actions are available…
              </p>
            )}
            <ActionButtons
              state={state}
              breakRecord={activeBreak}
              lunchRecord={activeLunch}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onRequestBreak={handleRequestBreak}
              onCancelBreakRequest={handleCancelBreakRequest}
              onStartBreak={handleActivateBreak}
              onEndBreak={handleEndBreak}
              onRequestLunch={handleRequestLunch}
              onCancelLunchRequest={handleCancelLunchRequest}
              onStartLunch={handleActivateLunch}
              onEndLunch={handleEndLunch}
              loading={actionLoading || attendanceLoading}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-yellow/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow/15 text-yellow">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Worked Today</p>
                  <p className="text-2xl font-semibold text-foreground">{workedTodayDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow/15 text-yellow">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Break Time</p>
                  <p className="text-2xl font-semibold text-foreground">{breakTimeDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow/15 text-yellow">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Streak</p>
                  <p className="text-2xl font-semibold text-foreground">{streakDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
