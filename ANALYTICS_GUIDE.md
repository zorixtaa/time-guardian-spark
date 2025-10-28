# Analytics & Reporting Guide

This guide covers all the analytics functions available in your Market Wave Attendance System.

## Table of Contents

1. [Overview](#overview)
2. [SQL Functions](#sql-functions)
3. [TypeScript API](#typescript-api)
4. [Usage Examples](#usage-examples)
5. [Analytics Dashboard Component](#analytics-dashboard-component)

---

## Overview

The analytics system provides comprehensive insights into:
- **Work patterns** - Hours worked, effective time, breaks taken
- **Leaderboards** - XP rankings, attendance streaks
- **Break analytics** - Duration statistics by break type
- **Team productivity** - Department comparisons and metrics
- **Activity logs** - Real-time monitoring for admins

All analytics functions are available as:
- **Postgres functions** (in the database)
- **TypeScript functions** (for frontend integration)
- **React components** (ready-to-use UI)

---

## SQL Functions

### 1. get_user_work_summary

Get comprehensive work statistics for a user.

**Parameters:**
- `p_user_id` (UUID) - User ID
- `p_start_date` (TIMESTAMP) - Start date
- `p_end_date` (TIMESTAMP) - End date

**Returns:**
```sql
{
  total_days_worked: INT,
  total_hours_clocked: NUMERIC,
  total_break_hours: NUMERIC,
  effective_work_hours: NUMERIC,
  coffee_break_count: INT,
  wc_break_count: INT,
  lunch_break_count: INT,
  avg_daily_hours: NUMERIC
}
```

**Example:**
```sql
SELECT * FROM get_user_work_summary(
  'user-uuid-here',
  '2024-01-01',
  '2024-01-31'
);
```

---

### 2. get_team_daily_stats

Get real-time statistics for a team on a specific date.

**Parameters:**
- `p_team_id` (UUID, optional) - Team ID (NULL for unassigned)
- `p_date` (DATE, optional) - Date (defaults to today)

**Returns:**
```sql
{
  total_members_checked_in: INT,
  currently_active: INT,
  on_coffee_break: INT,
  on_wc_break: INT,
  on_lunch_break: INT,
  total_hours_worked: NUMERIC,
  avg_hours_per_person: NUMERIC
}
```

**Example:**
```sql
SELECT * FROM get_team_daily_stats(
  'team-uuid-here',
  CURRENT_DATE
);
```

---

### 3. get_xp_leaderboard

Get top users ranked by XP.

**Parameters:**
- `p_limit` (INT, default: 10) - Max entries
- `p_team_id` (UUID, optional) - Filter by team

**Returns:**
```sql
{
  user_id: UUID,
  display_name: TEXT,
  team_name: TEXT,
  total_xp: INT,
  level: INT,
  rank: BIGINT
}
```

**Example:**
```sql
SELECT * FROM get_xp_leaderboard(10, NULL);
```

---

### 4. get_streak_leaderboard

Get users with longest attendance streaks.

**Parameters:**
- `p_limit` (INT, default: 10) - Max entries
- `p_team_id` (UUID, optional) - Filter by team

**Returns:**
```sql
{
  user_id: UUID,
  display_name: TEXT,
  team_name: TEXT,
  current_streak: INT,
  rank: BIGINT
}
```

**Example:**
```sql
SELECT * FROM get_streak_leaderboard(10, 'team-uuid');
```

---

### 5. get_break_statistics

Get detailed break duration statistics.

**Parameters:**
- `p_user_id` (UUID) - User ID
- `p_start_date` (TIMESTAMP) - Start date
- `p_end_date` (TIMESTAMP) - End date

**Returns:**
```sql
{
  break_type: break_type_enum,
  total_breaks: BIGINT,
  total_minutes: NUMERIC,
  avg_duration_minutes: NUMERIC,
  min_duration_minutes: NUMERIC,
  max_duration_minutes: NUMERIC
}
```

**Example:**
```sql
SELECT * FROM get_break_statistics(
  'user-uuid',
  '2024-01-01',
  '2024-01-31'
);
```

---

### 6. get_recent_activity

Get recent activity feed for admin monitoring.

**Parameters:**
- `p_team_id` (UUID, optional) - Filter by team
- `p_limit` (INT, default: 50) - Max entries

**Returns:**
```sql
{
  activity_id: TEXT,
  user_id: UUID,
  user_name: TEXT,
  activity_type: TEXT,
  activity_description: TEXT,
  occurred_at: TIMESTAMP,
  metadata: JSONB
}
```

**Example:**
```sql
SELECT * FROM get_recent_activity(NULL, 100);
```

---

### 7. get_department_productivity

Compare productivity across departments.

**Parameters:**
- `p_start_date` (DATE) - Start date
- `p_end_date` (DATE) - End date

**Returns:**
```sql
{
  team_id: UUID,
  team_name: TEXT,
  total_members: BIGINT,
  avg_hours_per_member: NUMERIC,
  avg_effective_hours: NUMERIC,
  total_breaks: BIGINT,
  attendance_rate: NUMERIC
}
```

**Example:**
```sql
SELECT * FROM get_department_productivity(
  '2024-01-01',
  '2024-01-31'
);
```

---

### 8. get_user_daily_breakdown

Get day-by-day work breakdown.

**Parameters:**
- `p_user_id` (UUID) - User ID
- `p_start_date` (DATE) - Start date
- `p_end_date` (DATE) - End date

**Returns:**
```sql
{
  work_date: DATE,
  clock_in_time: TIME,
  clock_out_time: TIME,
  total_hours: NUMERIC,
  break_hours: NUMERIC,
  effective_hours: NUMERIC,
  coffee_breaks: INT,
  wc_breaks: INT,
  lunch_breaks: INT
}
```

**Example:**
```sql
SELECT * FROM get_user_daily_breakdown(
  'user-uuid',
  '2024-01-01',
  '2024-01-31'
);
```

---

## TypeScript API

All functions are available in `/src/lib/analytics.ts`:

### getUserWorkSummary

```typescript
import { getUserWorkSummary } from '@/lib/analytics';

const summary = await getUserWorkSummary(
  userId,
  '2024-01-01T00:00:00Z',
  '2024-01-31T23:59:59Z'
);

console.log(`Total hours: ${summary.total_hours_clocked}`);
console.log(`Effective hours: ${summary.effective_work_hours}`);
```

### getXpLeaderboard

```typescript
import { getXpLeaderboard } from '@/lib/analytics';

const leaderboard = await getXpLeaderboard(10, teamId);

leaderboard.forEach(entry => {
  console.log(`${entry.rank}. ${entry.display_name} - Level ${entry.level}`);
});
```

### getStreakLeaderboard

```typescript
import { getStreakLeaderboard } from '@/lib/analytics';

const streaks = await getStreakLeaderboard(10);

streaks.forEach(entry => {
  console.log(`${entry.display_name}: ${entry.current_streak} days`);
});
```

### getBreakStatistics

```typescript
import { getBreakStatistics } from '@/lib/analytics';

const breakStats = await getBreakStatistics(
  userId,
  '2024-01-01T00:00:00Z',
  '2024-01-31T23:59:59Z'
);

breakStats.forEach(stat => {
  console.log(`${stat.break_type}: avg ${stat.avg_duration_minutes} min`);
});
```

### getDepartmentProductivity

```typescript
import { getDepartmentProductivity } from '@/lib/analytics';

const productivity = await getDepartmentProductivity(
  '2024-01-01',
  '2024-01-31'
);

productivity.forEach(dept => {
  console.log(`${dept.team_name}: ${dept.attendance_rate}% attendance`);
});
```

### Helper Functions

```typescript
import { formatHours, calculateEfficiency, getDateRange } from '@/lib/analytics';

// Format hours to readable string
const formatted = formatHours(8.5); // "8h 30m"

// Calculate efficiency percentage
const efficiency = calculateEfficiency(7.5, 8.5); // 88

// Get date range for common periods
const { start, end } = getDateRange('week'); // Last 7 days
const { start, end } = getDateRange('month'); // Last 30 days
const { start, end } = getDateRange('year'); // Last year
```

---

## Usage Examples

### Example 1: Personal Work Summary

```typescript
import { getUserWorkSummary, formatHours } from '@/lib/analytics';

const showMyStats = async (userId: string) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const summary = await getUserWorkSummary(
    userId,
    weekAgo.toISOString(),
    now.toISOString()
  );
  
  console.log('📊 Your Weekly Summary:');
  console.log(`⏰ Total Hours: ${formatHours(summary.total_hours_clocked)}`);
  console.log(`✅ Effective Hours: ${formatHours(summary.effective_work_hours)}`);
  console.log(`☕ Coffee Breaks: ${summary.coffee_break_count}`);
  console.log(`🚽 WC Breaks: ${summary.wc_break_count}`);
  console.log(`🍽️ Lunch Breaks: ${summary.lunch_break_count}`);
  console.log(`📅 Days Worked: ${summary.total_days_worked}`);
};
```

### Example 2: Team Dashboard

```typescript
import { getTeamDailyStats } from '@/lib/analytics';

const TeamOverview = async ({ teamId }: { teamId: string }) => {
  const stats = await getTeamDailyStats(teamId);
  
  return (
    <div>
      <h2>Team Status - {new Date().toLocaleDateString()}</h2>
      <ul>
        <li>Active: {stats.currently_active}</li>
        <li>Coffee Break: {stats.on_coffee_break}</li>
        <li>WC Break: {stats.on_wc_break}</li>
        <li>Lunch: {stats.on_lunch_break}</li>
        <li>Total Hours: {stats.total_hours_worked.toFixed(1)}h</li>
      </ul>
    </div>
  );
};
```

### Example 3: Leaderboard Display

```typescript
import { getXpLeaderboard } from '@/lib/analytics';

const Leaderboard = async () => {
  const top10 = await getXpLeaderboard(10);
  
  return (
    <div>
      <h2>🏆 Top Performers</h2>
      {top10.map(player => (
        <div key={player.user_id}>
          #{player.rank} - {player.display_name}
          <span>Level {player.level}</span>
          <span>{player.total_xp.toLocaleString()} XP</span>
        </div>
      ))}
    </div>
  );
};
```

### Example 4: Break Analysis

```typescript
import { getBreakStatistics } from '@/lib/analytics';

const analyzeBreaks = async (userId: string) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const stats = await getBreakStatistics(
    userId,
    monthStart.toISOString(),
    new Date().toISOString()
  );
  
  stats.forEach(({ break_type, total_breaks, avg_duration_minutes }) => {
    console.log(`${break_type}: ${total_breaks} breaks, avg ${Math.round(avg_duration_minutes)} min`);
  });
};
```

---

## Analytics Dashboard Component

A complete analytics dashboard component is available at:
`/src/components/analytics/AnalyticsDashboard.tsx`

### Usage:

```typescript
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

function MyPage({ user, teamId }) {
  return (
    <div>
      <h1>Analytics</h1>
      <AnalyticsDashboard user={user} teamId={teamId} />
    </div>
  );
}
```

### Features:

- ✅ **Work Summary Cards** - Total hours, effective hours, break time, daily average
- 📊 **XP Leaderboard** - Top 10 performers by experience points
- 🔥 **Streak Leaderboard** - Longest attendance streaks
- ☕ **Break Statistics** - Detailed break analysis by type
- 🏢 **Department Productivity** - Compare teams and departments
- 📅 **Daily Breakdown** - Day-by-day work summary
- 🔄 **Auto-refresh** - Real-time data updates
- 📆 **Date Range Selector** - Week, month, or year views

---

## Integration with Admin Dashboard

You can add analytics to the existing admin dashboard:

```typescript
// In AdminDashboard.tsx
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

// Add a new tab or section:
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Existing admin dashboard content */}
  </TabsContent>
  
  <TabsContent value="analytics">
    <AnalyticsDashboard user={user} teamId={teamId} />
  </TabsContent>
</Tabs>
```

---

## Performance Considerations

1. **Caching** - Consider caching analytics results for frequently accessed data
2. **Date Ranges** - Limit date ranges to reasonable periods (max 1 year)
3. **Pagination** - Leaderboards are limited by default (10-50 entries)
4. **Indexes** - All functions use indexed columns for optimal performance

---

## Security

- All functions use `SECURITY DEFINER` to run with proper permissions
- Row-level security (RLS) is respected through the underlying tables
- Team filtering ensures users only see their team's data (unless super admin)
- All functions are granted to `authenticated` role only

---

## Migration

The analytics functions are created by migration:
`/workspace/supabase/migrations/20251028160000_analytics_functions.sql`

To apply:
```bash
supabase db push
```

Or if using remote database:
```bash
supabase db push --db-url "your-connection-string"
```

---

## Next Steps

1. **Apply the migration** to create all SQL functions
2. **Import analytics functions** in your components
3. **Add the AnalyticsDashboard** component to your app
4. **Customize** the UI to match your brand
5. **Add more visualizations** using chart libraries (recharts, etc.)

---

## Support

For issues or questions:
- Check the SQL function comments in the migration file
- Review TypeScript types in `/src/lib/analytics.ts`
- Examine the sample component in `/src/components/analytics/AnalyticsDashboard.tsx`
