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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Building2,
  Coffee,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Clock4,
  Utensils,
  UserMinus,
  UserPlus,
  Trash2,
  UserCog,
  AlarmClockOff,
  Ban,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';
import { AttendanceRecord, BreakRecord, UserRole } from '@/types/attendance';
import {
  forceEndBreak,
  approveBreak,
  denyBreak,
  getPendingBreakRequests,
} from '@/lib/attendanceActions';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpProgress } from '@/components/xp/XpProgress';

interface AdminDashboardProps {
  user: User;
  onSignOut: () => void;
  role: UserRole;
  teamId: string | null;
  displayName?: string | null;
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
  teamId: string | null;
  teamName: string;
}

type AttendanceSnapshot = Pick<AttendanceRecord, 'id' | 'user_id' | 'clock_in_at' | 'clock_out_at'>;
type ActiveBreak = Pick<BreakRecord, 'id' | 'user_id' | 'type' | 'started_at' | 'status'>;

interface ActivityItem {
  id: string;
  userName: string;
  action: 'checked-in' | 'break' | 'lunch';
  occurredAt: string;
}

interface ManagedBreakRow {
  id: string;
  userId: string;
  userName: string;
  type: BreakRecord['type'];
  status: BreakRecord['status'];
  startedAt: string | null;
  createdAt: string;
}

interface DepartmentSummary {
  id: string;
  name: string;
  memberCount: number;
  activeCount: number;
  adminCount: number;
}

interface RoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
}

interface TeamOption {
  id: string;
  name: string;
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

const AdminDashboard = ({ user, onSignOut, role, teamId, displayName }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<OverviewMetrics>({ active: 0, onBreak: 0, onLunch: 0, total: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [roleRecords, setRoleRecords] = useState<RoleRecord[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [selectedAdminCandidate, setSelectedAdminCandidate] = useState('');
  const [promotingAdmin, setPromotingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [selectedAssignmentMember, setSelectedAssignmentMember] = useState('');
  const [selectedAssignmentDepartment, setSelectedAssignmentDepartment] = useState('');
  const [assigningDepartment, setAssigningDepartment] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);
  const [managedBreaks, setManagedBreaks] = useState<ManagedBreakRow[]>([]);
  const [pendingBreakRequests, setPendingBreakRequests] = useState<any[]>([]);
  const [forceEndingBreakId, setForceEndingBreakId] = useState<string | null>(null);
  const [approvingBreakId, setApprovingBreakId] = useState<string | null>(null);
  const [denyingBreakId, setDenyingBreakId] = useState<string | null>(null);
  const xpState = useXpSystem(user.id);
  const isSuperAdmin = role === 'super_admin';

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

        const profileQuery = supabase
          .from('profiles')
          .select('id, display_name, team_id')
          .order('display_name', { ascending: true });

        if (!isSuperAdmin) {
          if (teamId) {
            profileQuery.eq('team_id', teamId);
          } else {
            profileQuery.is('team_id', null);
          }
        }

        const { data: profileData, error: profileError } = await profileQuery;

        if (profileError) {
          throw profileError;
        }

        const profiles = profileData ?? [];
        const visibleUserIds = profiles.map((profile) => profile.id);

        let teamsData: { id: string; name: string }[] = [];

        if (isSuperAdmin) {
          const { data: allTeams, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .order('name', { ascending: true });

          if (teamsError) {
            throw teamsError;
          }

          teamsData = allTeams ?? [];
        } else if (teamId) {
          const { data: teamRecord, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', teamId)
            .maybeSingle();

          if (teamError && teamError.code !== 'PGRST116') {
            throw teamError;
          }

          teamsData = teamRecord ? [teamRecord] : [];
        }

        let attendance: AttendanceSnapshot[] = [];
        let activeBreaks: ActiveBreak[] = [];
        let openBreaks: BreakRecord[] = [];
        let roles: RoleRecord[] = [];

        if (isSuperAdmin || visibleUserIds.length > 0) {
          const attendanceQuery = supabase
            .from('attendance')
            .select('id, user_id, clock_in_at, clock_out_at')
            .gte('clock_in_at', startOfDay.toISOString())
            .lte('clock_in_at', endOfDay.toISOString())
            .is('clock_out_at', null);

          if (!isSuperAdmin) {
            attendanceQuery.in('user_id', visibleUserIds);
          }

          const { data: attendanceData, error: attendanceError } = await attendanceQuery;

          if (attendanceError) {
            throw attendanceError;
          }

          attendance = (attendanceData ?? []) as AttendanceSnapshot[];
        }

        if (isSuperAdmin || visibleUserIds.length > 0) {
        const breaksQuery = supabase
          .from('breaks')
          .select('*')
          .in('status', ['pending', 'approved', 'active']);

          if (!isSuperAdmin) {
            breaksQuery.in('user_id', visibleUserIds);
          }

          const { data: breaksData, error: breaksError } = await breaksQuery;

          if (breaksError) {
            throw breaksError;
          }

          openBreaks = (breaksData ?? []) as BreakRecord[];

          const activeRecords = openBreaks.filter((record) => record.status === 'active');
          activeBreaks = activeRecords.map((record) => ({
            id: record.id,
            user_id: record.user_id,
            type: record.type,
            started_at: record.started_at,
            status: record.status,
          }));
        }

        if (isSuperAdmin || visibleUserIds.length > 0) {
          const rolesQuery = supabase.from('user_roles').select('user_id, role, id');

          if (!isSuperAdmin) {
            rolesQuery.in('user_id', visibleUserIds);
          }

          const { data: rolesData, error: rolesError } = await rolesQuery;

          if (rolesError) {
            throw rolesError;
          }

          roles = (rolesData ?? []) as RoleRecord[];
        }

        setRoleRecords(roles);
        setTeamOptions(isSuperAdmin ? teamsData : []);

        const onLunch = activeBreaks.filter((breakRecord) => breakRecord.type === 'lunch').length;
        const onBreak = activeBreaks.length - onLunch;
        const totalActive = attendance.length;
        const active = Math.max(totalActive - onBreak - onLunch, 0);

        setOverview({ active, onBreak, onLunch, total: totalActive });

        const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
        const attendanceByUser = new Map(attendance.map((record) => [record.user_id, record]));
        const breakByUser = new Map(activeBreaks.map((record) => [record.user_id, record]));
        const roleByUser = new Map<string, UserRole>();

        const managedBreakRows: ManagedBreakRow[] = openBreaks
          .filter((record) => record.status === 'active')
          .map((record) => ({
            id: record.id,
            userId: record.user_id,
            userName: profileMap.get(record.user_id) ?? 'Unknown teammate',
            type: record.type,
            status: record.status,
            startedAt: record.started_at,
            createdAt: record.created_at,
          }));

        setManagedBreaks(managedBreakRows);

        // Fetch pending break requests
        const pendingRequests = await getPendingBreakRequests(teamId);
        setPendingBreakRequests(pendingRequests);

        roles.forEach((record) => {
          if (record.role === 'super_admin') {
            roleByUser.set(record.user_id, 'super_admin');
          } else if (record.role === 'admin' && roleByUser.get(record.user_id) !== 'super_admin') {
            roleByUser.set(record.user_id, 'admin');
          }
        });

        const statusWeight: Record<TeamMemberRow['status'], number> = {
          Active: 0,
          'On Break': 1,
          'On Lunch': 2,
          Offline: 3,
        };

        const teamNameMap = new Map(teamsData.map((team) => [team.id, team.name]));
        const membersByTeam = new Map<string | null, typeof profiles>();

        profiles.forEach((profile) => {
          const key = profile.team_id ?? null;
          if (!membersByTeam.has(key)) {
            membersByTeam.set(key, []);
          }
          membersByTeam.get(key)!.push(profile);
        });

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
              teamId: profile.team_id,
              teamName: profile.team_id
                ? teamNameMap.get(profile.team_id) ?? 'Unknown department'
                : 'Unassigned',
            };
          })
          .sort((a, b) => statusWeight[a.status] - statusWeight[b.status] || a.name.localeCompare(b.name));

        setTeamMembers(roster);

        const departmentSummaries: DepartmentSummary[] = teamsData.map((team) => {
          const members = membersByTeam.get(team.id) ?? [];
          const memberIds = new Set(members.map((member) => member.id));
          const activeCount = Array.from(memberIds).filter(
            (memberId) => attendanceByUser.has(memberId) || breakByUser.has(memberId),
          ).length;
          const adminCount = members.filter((member) => roleByUser.get(member.id) === 'admin').length;

          return {
            id: team.id,
            name: team.name,
            memberCount: members.length,
            activeCount,
            adminCount,
          };
        });

        const unassignedMembers = membersByTeam.get(null) ?? [];
        const unassignedIds = new Set(unassignedMembers.map((member) => member.id));
        const unassignedSummary = {
          id: 'unassigned',
          name: 'Unassigned',
          memberCount: unassignedMembers.length,
          activeCount: Array.from(unassignedIds).filter(
            (memberId) => attendanceByUser.has(memberId) || breakByUser.has(memberId),
          ).length,
          adminCount: unassignedMembers.filter((member) => roleByUser.get(member.id) === 'admin').length,
        };

        const summariesWithUnassigned = departmentSummaries.filter((dept) => dept.id !== 'unassigned');

        summariesWithUnassigned.push(unassignedSummary);

        summariesWithUnassigned.sort((a, b) => {
          if (a.id === 'unassigned') return 1;
          if (b.id === 'unassigned') return -1;
          return a.name.localeCompare(b.name);
        });

        setDepartments(summariesWithUnassigned);

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
    [toast, isSuperAdmin, teamId],
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
    if (displayName) {
      return `Welcome back, ${displayName}!`;
    }

    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.display_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email;

    return fullName ? `Welcome back, ${fullName}!` : 'Welcome back!';
  }, [displayName, user]);

  const adminCandidates = useMemo(
    () => teamMembers.filter((member) => member.role === 'employee'),
    [teamMembers],
  );

  const currentAdmins = useMemo(
    () => teamMembers.filter((member) => member.role === 'admin'),
    [teamMembers],
  );

  const noAdminCandidates = adminCandidates.length === 0;

  const assignmentMembers = useMemo(
    () => [...teamMembers].sort((a, b) => a.name.localeCompare(b.name)),
    [teamMembers],
  );

  const assignmentDepartments = useMemo(() => {
    const sorted = [...teamOptions].sort((a, b) => a.name.localeCompare(b.name));
    return [...sorted, { id: '__unassigned', name: 'Unassigned' }];
  }, [teamOptions]);

  const noAssignmentMembers = assignmentMembers.length === 0;
  const noDepartmentChoices = teamOptions.length === 0;
  const hasManagedDepartments = departments.some((department) => department.id !== 'unassigned');

  const handleCreateDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperAdmin) {
      toast({
        title: 'Super admin access required',
        description: 'Only super admins can create departments.',
        variant: 'destructive',
      });
      return;
    }

    const name = newDepartmentName.trim();

    if (!name) {
      toast({
        title: 'Department name required',
        description: 'Give your new department a descriptive title.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingDepartment(true);

    try {
      const { error } = await supabase.from('teams').insert({ name });

      if (error) throw error;

      toast({
        title: 'Department created',
        description: `${name} is now available for your teammates.`,
      });

      setNewDepartmentName('');
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to create department', error);
      toast({
        title: 'Unable to create department',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setCreatingDepartment(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!isSuperAdmin) {
      toast({
        title: 'Super admin access required',
        description: 'Only super admins can manage admin privileges.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAdminCandidate) {
      toast({
        title: 'Select a teammate',
        description: 'Choose who should receive admin privileges.',
        variant: 'destructive',
      });
      return;
    }

    const candidate = teamMembers.find((member) => member.id === selectedAdminCandidate);
    if (!candidate) {
      toast({
        title: 'Unknown teammate',
        description: 'Refresh the dashboard and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (candidate.role === 'admin' || candidate.role === 'super_admin') {
      toast({
        title: 'Already an admin',
        description: `${candidate.name} already has elevated access.`,
        variant: 'destructive',
      });
      return;
    }

    setPromotingAdmin(true);

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: selectedAdminCandidate, role: 'admin' }, { onConflict: 'user_id,role' });

      if (error) throw error;

      toast({
        title: 'Admin privileges granted',
        description: `${candidate.name} now has admin access.`,
      });

      setSelectedAdminCandidate('');
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to promote admin', error);
      toast({
        title: 'Unable to promote',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setPromotingAdmin(false);
    }
  };

  const handleAssignDepartment = async () => {
    if (!isSuperAdmin) {
      toast({
        title: 'Super admin access required',
        description: 'Only super admins can reassign departments.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAssignmentMember || !selectedAssignmentDepartment) {
      toast({
        title: 'Select teammate and department',
        description: 'Choose who should move and where they should go.',
        variant: 'destructive',
      });
      return;
    }

    const teammate = teamMembers.find((member) => member.id === selectedAssignmentMember);
    if (!teammate) {
      toast({
        title: 'Unknown teammate',
        description: 'Refresh the dashboard and try again.',
        variant: 'destructive',
      });
      return;
    }

    const nextDepartmentId =
      selectedAssignmentDepartment === '__unassigned' ? null : selectedAssignmentDepartment;

    const nextDepartmentName =
      selectedAssignmentDepartment === '__unassigned'
        ? 'Unassigned'
        : teamOptions.find((team) => team.id === selectedAssignmentDepartment)?.name ?? 'Selected department';

    setAssigningDepartment(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: nextDepartmentId })
        .eq('id', teammate.id);

      if (error) throw error;

      toast({
        title: 'Department updated',
        description: `${teammate.name} is now part of ${nextDepartmentName}.`,
      });

      setSelectedAssignmentMember('');
      setSelectedAssignmentDepartment('');
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to assign department', error);
      toast({
        title: 'Unable to update department',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setAssigningDepartment(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: 'Super admin access required',
        description: 'Only super admins can delete departments.',
        variant: 'destructive',
      });
      return;
    }

    const department = teamOptions.find((team) => team.id === departmentId);

    if (!department) {
      toast({
        title: 'Department not found',
        description: 'Refresh the dashboard and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Delete ${department.name}? Everyone currently assigned will become unassigned.`,
      );
      if (!confirmed) {
        return;
      }
    }

    setDeletingDepartmentId(departmentId);

    try {
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', departmentId);

      if (resetError) throw resetError;

      const { error: deleteError } = await supabase.from('teams').delete().eq('id', departmentId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Department deleted',
        description: `${department.name} has been removed and members are now unassigned.`,
      });

      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to delete department', error);
      toast({
        title: 'Unable to delete department',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setDeletingDepartmentId(null);
    }
  };


  const handleApproveBreak = async (breakId: string) => {
    setApprovingBreakId(breakId);

    try {
      await approveBreak(breakId, user.id);
      toast({
        title: 'Break approved',
        description: 'The teammate can now take their break.',
      });
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to approve break', error);
      toast({
        title: 'Unable to approve break',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setApprovingBreakId(null);
    }
  };

  const handleDenyBreak = async (breakId: string) => {
    setDenyingBreakId(breakId);

    try {
      await denyBreak(breakId, user.id, 'Denied by admin');
      toast({
        title: 'Break denied',
        description: 'The teammate has been notified.',
      });
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to deny break', error);
      toast({
        title: 'Unable to deny break',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setDenyingBreakId(null);
    }
  };

  const handleForceEndBreak = async (breakId: string) => {
    setForceEndingBreakId(breakId);

    try {
      await forceEndBreak(breakId, user.id);
      toast({
        title: 'Break ended',
        description: 'The teammate has been returned to active status.',
      });
      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to force end break', error);
      toast({
        title: 'Unable to end break',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setForceEndingBreakId(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: 'Super admin access required',
        description: 'Only super admins can remove admin privileges.',
        variant: 'destructive',
      });
      return;
    }

    const adminRecord = roleRecords.find((record) => record.user_id === userId && record.role === 'admin');

    if (!adminRecord) {
      toast({
        title: 'Admin record not found',
        description: 'Refresh the dashboard and try again.',
        variant: 'destructive',
      });
      return;
    }

    setRemovingAdminId(userId);

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', adminRecord.id);

      if (error) throw error;

      toast({
        title: 'Admin removed',
        description: 'The teammate now has standard employee access.',
      });

      await fetchAdminData();
    } catch (error: any) {
      console.error('Failed to remove admin', error);
      toast({
        title: 'Unable to remove admin',
        description: error.message ?? 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setRemovingAdminId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-yellow" />
      </div>
    );
  }

  const dashboardTitle = isSuperAdmin ? 'Super Admin Control Center' : 'Admin Command Center';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/80 text-foreground">
      <div className="border-b border-yellow/10 bg-black/40 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow/20 text-yellow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-yellow/80">{dashboardTitle}</p>
              <h1 className="text-2xl font-semibold">{adminGreeting}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            {(xpState.loading || xpState.xpEnabled) && (
              <XpProgress
                loading={xpState.loading}
                level={xpState.level}
                totalXp={xpState.totalXp}
                progressPercentage={xpState.progressPercentage}
                xpToNextLevel={xpState.xpToNextLevel}
                className="w-64"
              />
            )}
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-yellow/30 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Coffee className="h-5 w-5 text-yellow" />
                  Active Breaks
                </CardTitle>
                <CardDescription>Monitor ongoing breaks and force-end if needed.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {managedBreaks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active breaks at the moment.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-yellow/10">
                      <TableHead className="text-muted-foreground">Teammate</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Since</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managedBreaks.map((record) => {
                      const since = record.startedAt ?? record.createdAt;
                      const statusLabel = 'Active';
                      const badgeClass = 'bg-yellow text-yellow-foreground';

                      return (
                        <TableRow key={record.id} className="border-yellow/10">
                          <TableCell className="font-medium text-foreground">{record.userName}</TableCell>
                          <TableCell className="text-sm capitalize text-muted-foreground">{record.type}</TableCell>
                          <TableCell>
                            <Badge className={badgeClass}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {since
                              ? new Date(since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </TableCell>
                          <TableCell className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-yellow/40 text-yellow hover:bg-yellow/10"
                              disabled={forceEndingBreakId === record.id || refreshing}
                              onClick={() => handleForceEndBreak(record.id)}
                            >
                              {forceEndingBreakId === record.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <AlarmClockOff className="h-4 w-4" />
                              )}
                              <span>End Now</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
                    <TableHead className="text-muted-foreground">Department</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">{member.teamName}</TableCell>
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
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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

        {isSuperAdmin && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-yellow/30 bg-card/50 backdrop-blur">
              <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-yellow" />
                Departments
              </CardTitle>
              <CardDescription>Organize the organization by teams and departments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCreateDepartment} className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-department" className="text-sm text-muted-foreground">
                    Create a new department
                  </Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="new-department"
                      placeholder="e.g. Customer Success"
                      value={newDepartmentName}
                      onChange={(event) => setNewDepartmentName(event.target.value)}
                      className="h-11 rounded-xl border-yellow/20 bg-black/40 text-foreground"
                    />
                    <Button
                      type="submit"
                      className="sm:w-auto h-11 rounded-xl bg-yellow text-yellow-foreground hover:bg-yellow/90"
                      disabled={creatingDepartment || !newDepartmentName.trim()}
                    >
                      {creatingDepartment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add department'}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="space-y-2">
                <Label htmlFor="assignment-member" className="text-sm text-muted-foreground">
                  Assign or move a teammate
                </Label>
                <div className="flex flex-col gap-3 lg:flex-row">
                  <Select
                    value={selectedAssignmentMember}
                    onValueChange={setSelectedAssignmentMember}
                    disabled={noAssignmentMembers || assigningDepartment}
                  >
                    <SelectTrigger
                      id="assignment-member"
                      className="h-11 w-full rounded-xl border-yellow/20 bg-black/40 text-foreground lg:max-w-xs"
                    >
                      <SelectValue
                        placeholder={
                          noAssignmentMembers ? 'No teammates available' : 'Choose teammate'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {noAssignmentMembers ? (
                        <SelectItem value="__no_members" disabled>
                          No teammates available
                        </SelectItem>
                      ) : (
                        assignmentMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} · {formatRole(member.role)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedAssignmentDepartment}
                    onValueChange={setSelectedAssignmentDepartment}
                    disabled={assigningDepartment}
                  >
                    <SelectTrigger
                      id="assignment-department"
                      className="h-11 w-full rounded-xl border-yellow/20 bg-black/40 text-foreground lg:max-w-xs"
                    >
                      <SelectValue
                        placeholder={
                          noDepartmentChoices
                            ? 'Create a department or choose Unassigned'
                            : 'Choose department'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentDepartments.map((departmentOption) => (
                        <SelectItem key={departmentOption.id} value={departmentOption.id}>
                          {departmentOption.id === '__unassigned'
                            ? 'Unassigned (no department)'
                            : departmentOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    onClick={handleAssignDepartment}
                    className="h-11 rounded-xl bg-yellow text-yellow-foreground hover:bg-yellow/90 lg:w-auto"
                    disabled={
                      assigningDepartment ||
                      noAssignmentMembers ||
                      !selectedAssignmentMember ||
                      !selectedAssignmentDepartment
                    }
                  >
                    {assigningDepartment ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                    <span className="ml-2">Assign</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Promote admins or shuffle employees between departments whenever responsibilities change.
                </p>
              </div>

              <div className="space-y-3">
                {!hasManagedDepartments && (
                  <p className="text-sm text-muted-foreground">
                    No departments found yet. Create your first department to start organizing teams.
                  </p>
                )}

                {departments.map((department) => (
                  <div
                    key={department.id}
                    className="rounded-2xl border border-yellow/10 bg-black/30 p-4 text-sm text-muted-foreground"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{department.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {department.activeCount} active · {department.memberCount} total teammates
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow/15 text-yellow">
                          {department.adminCount} admin{department.adminCount === 1 ? '' : 's'}
                        </Badge>
                        {department.id !== 'unassigned' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-yellow hover:bg-yellow/10"
                            onClick={() => handleDeleteDepartment(department.id)}
                            disabled={deletingDepartmentId === department.id}
                            aria-label={`Delete ${department.name}`}
                          >
                            {deletingDepartmentId === department.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    {department.id === 'unassigned' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Assign teammates to a department above to remove them from this list.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

            <Card className="border-yellow/30 bg-card/50 backdrop-blur">
              <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-yellow" />
                Admin management
              </CardTitle>
              <CardDescription>Promote trusted teammates and keep access up to date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-select" className="text-sm text-muted-foreground">
                  Promote a teammate to admin
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select
                    value={selectedAdminCandidate}
                    onValueChange={setSelectedAdminCandidate}
                    disabled={noAdminCandidates || promotingAdmin}
                  >
                    <SelectTrigger
                      id="admin-select"
                      className="h-11 w-full rounded-xl border-yellow/20 bg-black/40 text-foreground sm:max-w-xs"
                    >
                      <SelectValue placeholder={noAdminCandidates ? 'No employees available' : 'Choose teammate'} />
                    </SelectTrigger>
                    <SelectContent>
                      {noAdminCandidates ? (
                        <SelectItem value="__no_options" disabled>
                          No employees available
                        </SelectItem>
                      ) : (
                        adminCandidates.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} · {member.teamName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handlePromoteToAdmin}
                    className="h-11 rounded-xl bg-yellow text-yellow-foreground hover:bg-yellow/90 sm:w-auto"
                    disabled={
                      promotingAdmin || !selectedAdminCandidate || selectedAdminCandidate === '__no_options'
                    }
                  >
                    {promotingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    <span className="ml-2">Promote</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Current admins</p>
                {currentAdmins.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No admins yet. Promote a teammate to give them elevated access.
                  </p>
                )}

                {currentAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-yellow/10 bg-black/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">{admin.teamName}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-yellow hover:bg-yellow/10"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={removingAdminId === admin.id}
                    >
                      {removingAdminId === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                      <span>Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            </Card>
          </section>
        )}

        <section className=\"grid grid-cols-1 gap-6 lg:grid-cols-2\">
          <Card className=\"border-yellow/30 bg-card/50 backdrop-blur\">
            <CardHeader className=\"flex flex-row items-center justify-between\">
              <div>
                <CardTitle className=\"flex items-center gap-2 text-lg\">
                  <Hourglass className=\"h-5 w-5 text-yellow\" />
                  Pending Break Requests
                </CardTitle>
                <CardDescription>Review and approve break requests from your team.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pendingBreakRequests.length === 0 ? (
                <p className=\"text-sm text-muted-foreground\">No pending break requests at the moment.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className=\"border-yellow/10\">
                      <TableHead className=\"text-muted-foreground\">Teammate</TableHead>
                      <TableHead className=\"text-muted-foreground\">Type</TableHead>
                      <TableHead className=\"text-muted-foreground\">Team</TableHead>
                      <TableHead className=\"text-muted-foreground\">Requested</TableHead>
                      <TableHead className=\"text-muted-foreground text-right\">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBreakRequests.map((request) => (
                      <TableRow key={request.break_id} className=\"border-yellow/10\">
                        <TableCell className=\"font-medium text-foreground\">{request.user_name}</TableCell>
                        <TableCell className=\"text-sm capitalize text-muted-foreground\">{request.break_type}</TableCell>
                        <TableCell className=\"text-sm text-muted-foreground\">{request.team_name}</TableCell>
                        <TableCell className=\"text-sm text-muted-foreground\">
                          {new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className=\"flex justify-end gap-2\">
                          <Button
                            size=\"sm\"
                            className=\"bg-green-600 text-white hover:bg-green-700\"
                            disabled={approvingBreakId === request.break_id || denyingBreakId === request.break_id}
                            onClick={() => handleApproveBreak(request.break_id)}
                          >
                            {approvingBreakId === request.break_id ? (
                              <Loader2 className=\"h-4 w-4 animate-spin\" />
                            ) : (
                              <CheckCircle2 className=\"h-4 w-4\" />
                            )}
                            <span className=\"ml-1\">Approve</span>
                          </Button>
                          <Button
                            size=\"sm\"
                            variant=\"outline\"
                            className=\"border-red-500/40 text-red-500 hover:bg-red-500/10\"
                            disabled={approvingBreakId === request.break_id || denyingBreakId === request.break_id}
                            onClick={() => handleDenyBreak(request.break_id)}
                          >
                            {denyingBreakId === request.break_id ? (
                              <Loader2 className=\"h-4 w-4 animate-spin\" />
                            ) : (
                              <Ban className=\"h-4 w-4\" />
                            )}
                            <span className=\"ml-1\">Deny</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
