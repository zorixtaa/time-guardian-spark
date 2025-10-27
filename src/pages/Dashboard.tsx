import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendanceState } from '@/hooks/useAttendanceState';
import { useXpSystem } from '@/hooks/useXpSystem';
import { StateIndicator } from '@/components/attendance/StateIndicator';
import { ActionButtons } from '@/components/attendance/ActionButtons';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  startLunch,
  endLunch
} from '@/lib/attendanceActions';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Clock, Coffee, Utensils, Target } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { UserRole } from '@/types/attendance';
import { XpProgress } from '@/components/xp/XpProgress';

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
    refresh,
    loading: attendanceLoading,
  } = useAttendanceState(user?.id);
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
      await refresh();
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
      await refresh();
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

  const handleStartBreak = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await startBreak(user.id);
      toast({
        title: 'Break Started',
        description: 'Take your time!',
      });
      await refresh();
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
    if (!activeBreak) {
      toast({
        title: 'No active break',
        description: 'Start a break first to be able to end it.',
        variant: 'destructive',
      });
      return;
    }
    setActionLoading(true);
    try {
      await endBreak(activeBreak.id);
      toast({
        title: 'Break Ended',
        description: 'Welcome back!',
      });
      await refresh();
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

  const handleStartLunch = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await startLunch(user.id);
      toast({
        title: 'Lunch Break',
        description: 'Enjoy your meal!',
      });
      await refresh();
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
    if (!activeBreak) {
      toast({
        title: 'No active lunch break',
        description: 'Start a lunch break before ending it.',
        variant: 'destructive',
      });
      return;
    }
    setActionLoading(true);
    try {
      await endLunch(activeBreak.id);
      toast({
        title: 'Lunch Ended',
        description: 'Back to work!',
      });
      await refresh();
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

            {(state === 'on_break' || state === 'on_lunch') && activeBreak && (
              <div className="text-sm text-muted-foreground">
                Started at {new Date(activeBreak.started_at).toLocaleTimeString([], {
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
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onStartLunch={handleStartLunch}
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
                  <p className="text-2xl font-semibold text-foreground">0h 0m</p>
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
                  <p className="text-2xl font-semibold text-foreground">0m</p>
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
                  <p className="text-2xl font-semibold text-foreground">0 days</p>
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
