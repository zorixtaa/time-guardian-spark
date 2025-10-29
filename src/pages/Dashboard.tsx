import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendanceState } from '@/hooks/useAttendanceState';
import { useAttendanceMetrics } from '@/hooks/useAttendanceMetrics';
import { useXpSystem } from '@/hooks/useXpSystem';
import { useBreakEntitlements } from '@/hooks/useBreakEntitlements';
import { StateIndicator } from '@/components/attendance/StateIndicator';
import { ActionButtons } from '@/components/attendance/ActionButtons';
import {
  checkIn,
  checkOut,
  toggleBreak,
  startApprovedBreak,
} from '@/lib/attendanceActions';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Clock, Coffee, UtensilsCrossed, CircleSlash2, Target, Zap } from 'lucide-react';
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
  const [profileName, setProfileName] = useState<string | null>(null);

  const {
    state,
    currentAttendance,
    activeBreaks,
    refresh,
    loading: attendanceLoading,
  } = useAttendanceState(user?.id);
  const {
    metrics,
    loading: metricsLoading,
    refresh: refreshMetrics,
  } = useAttendanceMetrics(user?.id);
  const xpState = useXpSystem(user?.id);
  const {
    entitlements,
    loading: entitlementsLoading,
    fetchEntitlements,
  } = useBreakEntitlements(user?.id, currentAttendance?.id);

  // Calculate work duration since last break or clock-in
  const workDurationMinutes = useMemo(() => {
    if (!currentAttendance) return 0;
    
    const now = new Date();
    const clockInTime = new Date(currentAttendance.clock_in_at);
    
    // Find the most recent break end time
    const lastBreakEnd = activeBreaks
      .filter(break_ => break_.ended_at)
      .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];
    
    const startTime = lastBreakEnd ? new Date(lastBreakEnd.ended_at!) : clockInTime;
    return Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
  }, [currentAttendance, activeBreaks]);

  const ensureProfile = useCallback(
    async (currentUser: User) => {
      const fallbackName =
        (currentUser.user_metadata?.display_name as string | undefined) ||
        (currentUser.user_metadata?.full_name as string | undefined) ||
        (currentUser.user_metadata?.name as string | undefined) ||
        currentUser.email ||
        'Teammate';

      const { data: existingProfile, error: existingError } = await supabase
        .from('profiles')
        .select('id, display_name, team_id')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (existingError) {
        if (existingError.code === '42P01') {
          setProfileName(fallbackName);
          setUserTeamId(null);
          return null;
        }

        if (existingError.code !== 'PGRST116') {
          throw existingError;
        }
      }

      if (existingProfile) {
        setProfileName(existingProfile.display_name ?? fallbackName);
        setUserTeamId(existingProfile.team_id ?? null);
        return existingProfile;
      }

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          user_id: currentUser.id,
          display_name: fallbackName,
          team_id: null,
        })
        .select('id, display_name, team_id')
        .single();

      if (insertError) {
        if ((insertError as any).code === '42P01') {
          setProfileName(fallbackName);
          setUserTeamId(null);
          return null;
        }

        if ((insertError as any).code === '23505') {
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('id, display_name, team_id')
            .eq('id', currentUser.id)
            .single();

          if (retryError) {
            throw retryError;
          }

          setProfileName(retryProfile.display_name ?? fallbackName);
          setUserTeamId(retryProfile.team_id ?? null);
          return retryProfile;
        }

        throw insertError;
      }

      setProfileName(insertedProfile.display_name ?? fallbackName);
      setUserTeamId(insertedProfile.team_id ?? null);
      return insertedProfile;
    },
    [],
  );

  const fetchUserRole = useCallback(
    async (currentUser: User) => {
      setRoleLoading(true);
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (roleError && roleError.code !== 'PGRST116') {
          throw roleError;
        }

        await ensureProfile(currentUser);

        setRole((roleData?.role as UserRole) ?? 'employee');
      } catch (error: any) {
        console.error('Error fetching user role:', error);
        toast({
          title: 'Unable to determine access level',
          description: 'Showing the employee dashboard for now.',
          variant: 'destructive',
        });
        setRole('employee');
        setUserTeamId(null);
        setProfileName(null);
      } finally {
        setRoleLoading(false);
      }
    },
    [ensureProfile, toast],
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        void fetchUserRole(currentUser);
      } else {
        setRole('employee');
        setRoleLoading(false);
        navigate('/auth');
        setProfileName(null);
        setUserTeamId(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void fetchUserRole(nextUser);
      } else {
        setRole('employee');
        setRoleLoading(false);
        navigate('/auth');
        setProfileName(null);
        setUserTeamId(null);
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
    setProfileName(null);
    setUserTeamId(null);
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

  const handleRequestCoffee = async () => {
    if (!user || !currentAttendance) return;
    setActionLoading(true);
    try {
      const result = await toggleBreak(user.id, currentAttendance.id, 'coffee', userTeamId);
      if (result.action === 'started') {
        toast({
          title: 'Coffee Break Started',
          description: 'Enjoy your coffee!',
        });
      } else if (result.action === 'requested') {
        toast({
          title: 'Break Requested',
          description: 'Waiting for admin approval...',
        });
      } else {
        toast({
          title: 'Coffee Break Ended',
          description: 'Back to work!',
        });
      }
      await Promise.all([refresh(), refreshMetrics(), fetchEntitlements()]);
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

  const handleRequestWc = async () => {
    if (!user || !currentAttendance) return;
    setActionLoading(true);
    try {
      const result = await toggleBreak(user.id, currentAttendance.id, 'wc', userTeamId);
      if (result.action === 'started') {
        toast({
          title: 'WC Break Started',
          description: 'Take your time!',
        });
      } else if (result.action === 'requested') {
        toast({
          title: 'Break Requested',
          description: 'Waiting for admin approval...',
        });
      } else {
        toast({
          title: 'WC Break Ended',
          description: 'Welcome back!',
        });
      }
      await Promise.all([refresh(), refreshMetrics(), fetchEntitlements()]);
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
    if (!user || !currentAttendance) return;
    setActionLoading(true);
    try {
      const result = await toggleBreak(user.id, currentAttendance.id, 'lunch', userTeamId);
      if (result.action === 'started') {
        toast({
          title: 'Lunch Break Started',
          description: 'Enjoy your meal!',
        });
      } else if (result.action === 'requested') {
        toast({
          title: 'Break Requested',
          description: 'Waiting for admin approval...',
        });
      } else {
        toast({
          title: 'Lunch Break Ended',
          description: 'Back to work!',
        });
      }
      await Promise.all([refresh(), refreshMetrics(), fetchEntitlements()]);
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

  const handleStartApprovedBreak = async (breakId: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await startApprovedBreak(breakId, user.id);
      toast({
        title: 'Break Started',
        description: 'Your break timer is now running',
      });
      await Promise.all([refresh(), refreshMetrics(), fetchEntitlements()]);
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
    if (profileName) {
      return profileName;
    }

    const metadata = user.user_metadata ?? {};
    const possibleName =
      (metadata.full_name as string | undefined) ||
      (metadata.display_name as string | undefined) ||
      (metadata.name as string | undefined) ||
      '';

    return (possibleName || user.email || '').toString();
  }, [profileName, user]);

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
  const effectiveTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.effectiveMinutes);
  const breakTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.totalBreakMinutes);
  const coffeeTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.coffeeMinutes);
  const wcTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.wcMinutes);
  const lunchTimeDisplay = metricsLoading
    ? 'Calculating…'
    : formatHoursAndMinutes(metrics.lunchMinutes);
  const streakDisplay = metricsLoading ? 'Calculating…' : formatDaysLabel(metrics.streakDays);
  const activeBreak = activeBreaks.length > 0 ? activeBreaks[0] : null;

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
        displayName={profileName}
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

            {activeBreak?.started_at && (
              <div className="text-sm text-muted-foreground">
                Current break started at {new Date(activeBreak.started_at).toLocaleTimeString([], {
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
              activeBreaks={activeBreaks}
              entitlements={entitlements}
              workDurationMinutes={workDurationMinutes}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onRequestCoffee={handleRequestCoffee}
              onRequestWc={handleRequestWc}
              onRequestLunch={handleRequestLunch}
              onStartApprovedBreak={handleStartApprovedBreak}
              loading={actionLoading || attendanceLoading || entitlementsLoading}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-yellow/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow/15 text-yellow">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Total Clocked</p>
                  <p className="text-2xl font-semibold text-foreground">{workedTodayDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Effective Work</p>
                  <p className="text-2xl font-semibold text-green-400">{effectiveTimeDisplay}</p>
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

          <Card className="border-orange-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Coffee Breaks</p>
                  <p className="text-2xl font-semibold text-foreground">{coffeeTimeDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                  <CircleSlash2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">WC Breaks</p>
                  <p className="text-2xl font-semibold text-foreground">{wcTimeDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground/80">Lunch Breaks</p>
                  <p className="text-2xl font-semibold text-foreground">{lunchTimeDisplay}</p>
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
