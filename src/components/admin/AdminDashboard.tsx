import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Coffee,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Clock4,
  Utensils,
} from 'lucide-react';
import { AttendanceRecord, BreakRecord, UserRole } from '@/types/attendance';

interface AdminDashboardProps {
  user: User;
  onSignOut: () => void;
}

interface OverviewMetrics {
  active: number;
  onBreak: number;
  onLunch: number;
  total: number;
}

interface TeamMemberRow {
  id: string;
  name: string;
  role: UserRole;
  status: 'Active' | 'On Break' | 'On Lunch' | 'Offline';
  lastActivity: string | null;
}

type AttendanceSnapshot = Pick<AttendanceRecord, 'id' | 'user_id' | 'clock_in_at' | 'clock_out_at'>;
type ActiveBreak = Pick<BreakRecord, 'id' | 'user_id' | 'type' | 'started_at'>;

interface ActivityItem {
  id: string;
  userName: string;
  action: 'checked-in' | 'break' | 'lunch';
  occurredAt: string;
}

const activityLabel: Record<ActivityItem['action'], string> = {
  'checked-in': 'Checked in for the day',
  break: 'Started a break',
  lunch: 'Went on lunch',
};

const formatRole = (role: UserRole) =>
  role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const AdminDashboard = ({ user, onSignOut }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<OverviewMetrics>({ active: 0, onBreak: 0, onLunch: 0, total: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  const fetchAdminData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const [attendanceRes, breaksRes, profilesRes, rolesRes] = await Promise.all([
          supabase
            .from('attendance')
            .select('id, user_id, clock_in_at, clock_out_at')
            .gte('clock_in_at', startOfDay.toISOString())
            .lte('clock_in_at', endOfDay.toISOString())
            .is('clock_out_at', null),
          supabase
            .from('breaks')
            .select('id, user_id, type, started_at')
            .eq('status', 'active'),
          supabase.from('profiles').select('id, display_name, team_id').order('display_name', { ascending: true }),
          supabase.from('user_roles').select('user_id, role'),
        ]);

        if (attendanceRes.error || breaksRes.error || profilesRes.error || rolesRes.error) {
          throw attendanceRes.error || breaksRes.error || profilesRes.error || rolesRes.error;
        }

        const attendance = (attendanceRes.data ?? []) as AttendanceSnapshot[];
        const activeBreaks = (breaksRes.data ?? []) as ActiveBreak[];
        const profiles = profilesRes.data ?? [];
        const roles = rolesRes.data ?? [];

        const onLunch = activeBreaks.filter((breakRecord) => breakRecord.type === 'lunch').length;
        const onBreak = activeBreaks.length - onLunch;
        const totalActive = attendance.length;
        const active = Math.max(totalActive - onBreak - onLunch, 0);

        setOverview({ active, onBreak, onLunch, total: totalActive });

        const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
        const attendanceByUser = new Map(attendance.map((record) => [record.user_id, record]));
        const breakByUser = new Map(activeBreaks.map((record) => [record.user_id, record]));
        const roleByUser = new Map(roles.map((record) => [record.user_id, record.role as UserRole]));

        const statusWeight: Record<TeamMemberRow['status'], number> = {
          Active: 0,
          'On Break': 1,
          'On Lunch': 2,
          Offline: 3,
        };

        const roster: TeamMemberRow[] = profiles
          .map((profile) => {
            const currentBreak = breakByUser.get(profile.id);
            const currentAttendance = attendanceByUser.get(profile.id);

            let status: TeamMemberRow['status'] = 'Offline';
            let lastActivity: string | null = null;

            if (currentBreak) {
              status = currentBreak.type === 'lunch' ? 'On Lunch' : 'On Break';
              lastActivity = currentBreak.started_at;
            } else if (currentAttendance) {
              status = 'Active';
              lastActivity = currentAttendance.clock_in_at;
            }

            return {
              id: profile.id,
              name: profile.display_name,
              role: roleByUser.get(profile.id) ?? 'employee',
              status,
              lastActivity,
            };
          })
          .sort((a, b) => statusWeight[a.status] - statusWeight[b.status] || a.name.localeCompare(b.name));

        setTeamMembers(roster);

        const activity: ActivityItem[] = [
          ...attendance.map((record) => ({
            id: `attendance-${record.id}`,
            userName: profileMap.get(record.user_id) ?? 'Unknown teammate',
            action: 'checked-in' as const,
            occurredAt: record.clock_in_at,
          })),
          ...activeBreaks.map((record) => ({
            id: `break-${record.id}`,
            userName: profileMap.get(record.user_id) ?? 'Unknown teammate',
            action: record.type === 'lunch' ? ('lunch' as const) : ('break' as const),
            occurredAt: record.started_at,
          })),
        ]
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
          .slice(0, 8);

        setActivityFeed(activity);
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
        toast({
          title: 'Unable to load admin data',
          description: 'Please try refreshing in a moment.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchAdminData(true);

    const channel = supabase
      .channel('admin-dashboard-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breaks' }, () => fetchAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminData]);

  const adminGreeting = useMemo(() => {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.display_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email;

    return fullName ? `Welcome back, ${fullName}!` : 'Welcome back!';
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-yellow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/80 text-foreground">
      <div className="border-b border-yellow/10 bg-black/40 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow/20 text-yellow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-yellow/80">Super Admin Control Center</p>
              <h1 className="text-2xl font-semibold">{adminGreeting}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-yellow/40 bg-yellow/10 text-yellow hover:bg-yellow/20"
              onClick={() => fetchAdminData()}
              disabled={refreshing || loading}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Refresh</span>
            </Button>
            <Button
              className="bg-yellow text-yellow-foreground hover:bg-yellow/90"
              onClick={onSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-10 space-y-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active on Shift</CardTitle>
              <Users className="h-5 w-5 text-yellow" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow">{overview.active}</p>
              <p className="mt-2 text-xs text-muted-foreground">Currently working teammates</p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On Break</CardTitle>
              <Coffee className="h-5 w-5 text-yellow" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow">{overview.onBreak}</p>
              <p className="mt-2 text-xs text-muted-foreground">Short restorative pauses</p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On Lunch</CardTitle>
              <Utensils className="h-5 w-5 text-yellow" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow">{overview.onLunch}</p>
              <p className="mt-2 text-xs text-muted-foreground">Recharging with a meal</p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Present</CardTitle>
              <Sparkles className="h-5 w-5 text-yellow" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow">{overview.total}</p>
              <p className="mt-2 text-xs text-muted-foreground">Across every current shift</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-yellow/30 bg-card/50 backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Team Roster
                <Badge className="bg-yellow/20 text-yellow">Live</Badge>
              </CardTitle>
              <CardDescription>Track every teammate and their current status.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-yellow/10">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id} className="border-yellow/10">
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow/15 text-yellow">{formatRole(member.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            member.status === 'Active'
                              ? 'bg-yellow text-yellow-foreground'
                              : 'bg-yellow/15 text-yellow'
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.lastActivity
                          ? new Date(member.lastActivity).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {teamMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No teammates found yet. Invite your crew to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Real-time activity</CardTitle>
              <CardDescription>Latest check-ins and pauses across the team.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityFeed.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Things are calm right now. As soon as activity begins it will appear here.
                  </p>
                )}
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-xl border border-yellow/10 bg-black/30 px-4 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow/15 text-yellow">
                      {item.action === 'checked-in' && <Clock4 className="h-5 w-5" />}
                      {item.action === 'break' && <Coffee className="h-5 w-5" />}
                      {item.action === 'lunch' && <Utensils className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.userName}</p>
                      <p className="text-xs text-muted-foreground">{activityLabel[item.action]}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
