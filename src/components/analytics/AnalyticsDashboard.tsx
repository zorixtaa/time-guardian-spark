import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  TrendingUp,
  Flame,
  Calendar,
  Coffee,
  Clock,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  getUserWorkSummary,
  getXpLeaderboard,
  getStreakLeaderboard,
  getBreakStatistics,
  getDepartmentProductivity,
  getUserDailyBreakdown,
  formatHours,
  calculateEfficiency,
  type UserWorkSummary,
  type LeaderboardEntry,
  type StreakEntry,
  type BreakStatistics,
  type DepartmentProductivity,
  type DailyBreakdown,
} from '@/lib/analytics';

interface AnalyticsDashboardProps {
  user: User;
  teamId?: string | null;
}

type TimePeriod = 'week' | 'month' | 'year';

const AnalyticsDashboard = ({ user, teamId }: AnalyticsDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('week');
  
  // State for different analytics
  const [workSummary, setWorkSummary] = useState<UserWorkSummary | null>(null);
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<StreakEntry[]>([]);
  const [breakStats, setBreakStats] = useState<BreakStatistics[]>([]);
  const [deptProductivity, setDeptProductivity] = useState<DepartmentProductivity[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);

  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    const end = now.toISOString();
    let start = new Date();

    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      start: start.toISOString(),
      end,
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end, startDate, endDate } = getDateRange(period);

      // Fetch all analytics data in parallel
      const [
        summaryData,
        xpData,
        streakData,
        breakData,
        productivityData,
        breakdownData,
      ] = await Promise.all([
        getUserWorkSummary(user.id, start, end),
        getXpLeaderboard(10, teamId),
        getStreakLeaderboard(10, teamId),
        getBreakStatistics(user.id, start, end),
        getDepartmentProductivity(startDate, endDate),
        getUserDailyBreakdown(user.id, startDate, endDate),
      ]);

      setWorkSummary(summaryData);
      setXpLeaderboard(xpData);
      setStreakLeaderboard(streakData);
      setBreakStats(breakData);
      setDeptProductivity(productivityData);
      setDailyBreakdown(breakdownData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, user.id, teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow" />
      </div>
    );
  }

  const efficiency = workSummary
    ? calculateEfficiency(workSummary.effective_work_hours, workSummary.total_hours_clocked)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your work patterns and team performance
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[180px] border-yellow/20 bg-black/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            className="border-yellow/40 bg-yellow/10 text-yellow hover:bg-yellow/20"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Work Summary Cards */}
      {workSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow">
                {formatHours(workSummary.total_hours_clocked)}
              </div>
              <p className="text-xs text-muted-foreground">
                {workSummary.total_days_worked} days worked
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Effective Hours</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow">
                {formatHours(workSummary.effective_work_hours)}
              </div>
              <p className="text-xs text-muted-foreground">
                {efficiency}% efficiency
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Break Time</CardTitle>
              <Coffee className="h-4 w-4 text-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow">
                {formatHours(workSummary.total_break_hours)}
              </div>
              <p className="text-xs text-muted-foreground">
                {workSummary.coffee_break_count + workSummary.wc_break_count + workSummary.lunch_break_count} breaks total
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow/30 bg-card/40 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <Calendar className="h-4 w-4 text-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow">
                {formatHours(workSummary.avg_daily_hours)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per working day
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* XP Leaderboard */}
        <Card className="border-yellow/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow" />
              XP Leaderboard
            </CardTitle>
            <CardDescription>Top performers by experience points</CardDescription>
          </CardHeader>
          <CardContent>
            {xpLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-yellow/10">
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Level</TableHead>
                    <TableHead className="text-right">XP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {xpLeaderboard.map((entry) => (
                    <TableRow key={entry.user_id} className="border-yellow/10">
                      <TableCell className="font-medium">
                        {entry.rank <= 3 ? (
                          <Badge className="bg-yellow text-yellow-foreground">
                            #{entry.rank}
                          </Badge>
                        ) : (
                          `#${entry.rank}`
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.display_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.team_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{entry.level}</TableCell>
                      <TableCell className="text-right font-bold text-yellow">
                        {entry.total_xp.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Streak Leaderboard */}
        <Card className="border-yellow/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-yellow" />
              Attendance Streaks
            </CardTitle>
            <CardDescription>Longest consecutive attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {streakLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-yellow/10">
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Streak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streakLeaderboard.map((entry) => (
                    <TableRow key={entry.user_id} className="border-yellow/10">
                      <TableCell className="font-medium">
                        {entry.rank <= 3 ? (
                          <Badge className="bg-yellow text-yellow-foreground">
                            #{entry.rank}
                          </Badge>
                        ) : (
                          `#${entry.rank}`
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.display_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.team_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-yellow">
                        {entry.current_streak} days
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Break Statistics */}
      {breakStats.length > 0 && (
        <Card className="border-yellow/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-yellow" />
              Break Statistics
            </CardTitle>
            <CardDescription>Your break patterns and duration analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-yellow/10">
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Time</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Min/Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakStats.map((stat) => (
                  <TableRow key={stat.break_type} className="border-yellow/10">
                    <TableCell className="font-medium capitalize">{stat.break_type}</TableCell>
                    <TableCell className="text-right">{stat.total_breaks}</TableCell>
                    <TableCell className="text-right">{Math.round(stat.total_minutes)} min</TableCell>
                    <TableCell className="text-right text-yellow font-medium">
                      {Math.round(stat.avg_duration_minutes)} min
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Math.round(stat.min_duration_minutes)} / {Math.round(stat.max_duration_minutes)} min
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Department Productivity */}
      {deptProductivity.length > 0 && (
        <Card className="border-yellow/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-yellow" />
              Department Productivity
            </CardTitle>
            <CardDescription>Comparative performance across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-yellow/10">
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Avg Hours</TableHead>
                  <TableHead className="text-right">Effective Hours</TableHead>
                  <TableHead className="text-right">Breaks</TableHead>
                  <TableHead className="text-right">Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptProductivity.map((dept) => (
                  <TableRow key={dept.team_id || 'unassigned'} className="border-yellow/10">
                    <TableCell className="font-medium">{dept.team_name}</TableCell>
                    <TableCell className="text-right">{dept.total_members}</TableCell>
                    <TableCell className="text-right">{dept.avg_hours_per_member.toFixed(1)}h</TableCell>
                    <TableCell className="text-right text-yellow font-medium">
                      {dept.avg_effective_hours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">{dept.total_breaks}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-yellow/15 text-yellow">
                        {dept.attendance_rate?.toFixed(0) || 0}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      {dailyBreakdown.length > 0 && (
        <Card className="border-yellow/30 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow" />
              Daily Breakdown
            </CardTitle>
            <CardDescription>Day-by-day work summary</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-yellow/10">
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Breaks</TableHead>
                  <TableHead className="text-right">Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyBreakdown.slice(0, 10).map((day) => (
                  <TableRow key={day.work_date} className="border-yellow/10">
                    <TableCell className="font-medium">
                      {new Date(day.work_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{day.clock_in_time}</TableCell>
                    <TableCell>{day.clock_out_time || 'Active'}</TableCell>
                    <TableCell className="text-right">{day.total_hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      {day.break_hours.toFixed(1)}h
                      <span className="text-xs text-muted-foreground ml-1">
                        ({day.coffee_breaks + day.wc_breaks + day.lunch_breaks})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-yellow">
                      {day.effective_hours.toFixed(1)}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
