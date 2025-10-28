# How to Integrate Analytics into Your Existing Dashboard

This guide shows you exactly how to add the new analytics features to your current admin dashboard.

---

## Option 1: Add Analytics Tab to Admin Dashboard

### Step 1: Install Required Dependency (if needed)
```bash
npm install @radix-ui/react-tabs
```

### Step 2: Update AdminDashboard.tsx

Add this import at the top:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
```

Then wrap your existing content in tabs:

```typescript
// Inside the AdminDashboard component's return statement,
// replace the <main> content with:

<main className="container mx-auto px-6 py-10">
  <Tabs defaultValue="overview" className="space-y-8">
    <TabsList className="bg-black/40 border border-yellow/20">
      <TabsTrigger value="overview" className="data-[state=active]:bg-yellow data-[state=active]:text-yellow-foreground">
        Overview
      </TabsTrigger>
      <TabsTrigger value="analytics" className="data-[state=active]:bg-yellow data-[state=active]:text-yellow-foreground">
        Analytics
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="space-y-8">
      {/* ALL YOUR EXISTING DASHBOARD CONTENT GOES HERE */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* ... existing overview cards ... */}
      </section>
      {/* ... rest of existing sections ... */}
    </TabsContent>

    <TabsContent value="analytics">
      <AnalyticsDashboard user={user} teamId={teamId} />
    </TabsContent>
  </Tabs>
</main>
```

---

## Option 2: Add Analytics Cards to Dashboard Page

Add individual analytics widgets directly to your dashboard:

### Example 1: Add XP Leaderboard Card

```typescript
import { useState, useEffect } from 'react';
import { getXpLeaderboard, type LeaderboardEntry } from '@/lib/analytics';
import { Trophy } from 'lucide-react';

// Inside your Dashboard component:
const [xpLeaders, setXpLeaders] = useState<LeaderboardEntry[]>([]);

useEffect(() => {
  const fetchLeaderboard = async () => {
    const data = await getXpLeaderboard(5, teamId); // Top 5
    setXpLeaders(data);
  };
  fetchLeaderboard();
}, [teamId]);

// Add this card to your dashboard:
<Card className="border-yellow/30 bg-card/50 backdrop-blur">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Trophy className="h-5 w-5 text-yellow" />
      Top Performers
    </CardTitle>
    <CardDescription>XP Leaderboard</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {xpLeaders.map((leader) => (
        <div key={leader.user_id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-yellow/20 text-yellow">#{leader.rank}</Badge>
            <span className="font-medium">{leader.display_name}</span>
          </div>
          <span className="text-sm text-yellow font-bold">
            Lvl {leader.level}
          </span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Example 2: Add Personal Stats Widget

```typescript
import { useState, useEffect } from 'react';
import { getUserWorkSummary, formatHours, type UserWorkSummary } from '@/lib/analytics';
import { Clock, TrendingUp } from 'lucide-react';

// Inside your Dashboard component:
const [weeklyStats, setWeeklyStats] = useState<UserWorkSummary | null>(null);

useEffect(() => {
  const fetchStats = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const data = await getUserWorkSummary(
      userId,
      weekAgo.toISOString(),
      new Date().toISOString()
    );
    setWeeklyStats(data);
  };
  fetchStats();
}, [userId]);

// Add this to your dashboard grid:
<Card className="border-yellow/30 bg-card/50 backdrop-blur">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Clock className="h-5 w-5 text-yellow" />
      This Week
    </CardTitle>
    <CardDescription>Your work summary</CardDescription>
  </CardHeader>
  <CardContent>
    {weeklyStats && (
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Hours:</span>
          <span className="font-bold text-yellow">
            {formatHours(weeklyStats.total_hours_clocked)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Effective Hours:</span>
          <span className="font-bold text-yellow">
            {formatHours(weeklyStats.effective_work_hours)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Days Worked:</span>
          <span className="font-bold text-yellow">
            {weeklyStats.total_days_worked}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Breaks:</span>
          <span className="font-bold text-yellow">
            {weeklyStats.coffee_break_count + 
             weeklyStats.wc_break_count + 
             weeklyStats.lunch_break_count}
          </span>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### Example 3: Add Team Status Widget

```typescript
import { useState, useEffect } from 'react';
import { getTeamDailyStats, type TeamDailyStats } from '@/lib/analytics';
import { Users, Coffee, Utensils } from 'lucide-react';

const [teamStats, setTeamStats] = useState<TeamDailyStats | null>(null);

useEffect(() => {
  const fetchTeamStats = async () => {
    const data = await getTeamDailyStats(teamId);
    setTeamStats(data);
  };
  fetchTeamStats();
  
  // Refresh every 30 seconds
  const interval = setInterval(fetchTeamStats, 30000);
  return () => clearInterval(interval);
}, [teamId]);

// Add this card:
<Card className="border-yellow/30 bg-card/50 backdrop-blur">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Users className="h-5 w-5 text-yellow" />
      Team Status
    </CardTitle>
    <CardDescription>Real-time team overview</CardDescription>
  </CardHeader>
  <CardContent>
    {teamStats && (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-yellow">
            {teamStats.currently_active}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">On Break</p>
          <p className="text-2xl font-bold text-yellow">
            {teamStats.on_coffee_break + teamStats.on_wc_break}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">At Lunch</p>
          <p className="text-2xl font-bold text-yellow">
            {teamStats.on_lunch_break}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold text-yellow">
            {teamStats.total_hours_worked.toFixed(1)}h
          </p>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Option 3: Create a Separate Analytics Page

### Step 1: Create a new route file

**File:** `src/pages/Analytics.tsx`

```typescript
import { User } from '@supabase/supabase-js';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface AnalyticsPageProps {
  user: User;
  teamId?: string | null;
  onBack: () => void;
}

const AnalyticsPage = ({ user, teamId, onBack }: AnalyticsPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/80 text-foreground">
      <div className="border-b border-yellow/10 bg-black/40 backdrop-blur">
        <div className="container mx-auto flex items-center gap-4 px-6 py-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-yellow hover:bg-yellow/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive insights and performance metrics
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-10">
        <AnalyticsDashboard user={user} teamId={teamId} />
      </main>
    </div>
  );
};

export default AnalyticsPage;
```

### Step 2: Add navigation button to your dashboard

```typescript
import { BarChart3 } from 'lucide-react';

// In your AdminDashboard or Dashboard component:
<Button
  variant="outline"
  className="border-yellow/40 bg-yellow/10 text-yellow hover:bg-yellow/20"
  onClick={() => navigate('/analytics')} // or setState to show analytics page
>
  <BarChart3 className="h-4 w-4 mr-2" />
  View Analytics
</Button>
```

---

## Option 4: Add to Employee Dashboard

You can also show personal analytics on the employee dashboard:

```typescript
// In your Dashboard.tsx (employee view)
import { getUserWorkSummary, getUserDailyBreakdown } from '@/lib/analytics';

// Add a section showing their personal stats:
<section className="mt-8">
  <h2 className="text-2xl font-bold mb-4">Your Performance</h2>
  
  <div className="grid gap-6 md:grid-cols-2">
    {/* Weekly summary card */}
    {/* Daily breakdown table */}
    {/* Break statistics */}
  </div>
</section>
```

---

## Recommended Implementation Order

1. **First:** Apply the database migration
   ```bash
   supabase db push
   ```

2. **Second:** Test individual queries in console
   ```typescript
   import { getUserWorkSummary } from '@/lib/analytics';
   const test = await getUserWorkSummary(userId, start, end);
   console.log(test);
   ```

3. **Third:** Add simple cards to existing dashboard (Option 2)
   - Start with XP leaderboard
   - Add personal stats widget
   - Add team status if admin

4. **Fourth:** Add full analytics tab or page (Option 1 or 3)
   - Once individual widgets work
   - Use the complete AnalyticsDashboard component

5. **Fifth:** Customize and refine
   - Adjust colors to match your theme
   - Add more visualizations
   - Add export features

---

## Quick Copy-Paste Integration

### Minimal Integration (Just add to imports and return)

**At the top of AdminDashboard.tsx:**
```typescript
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Replace your main content:**
```typescript
<main className="container mx-auto px-6 py-10">
  <Tabs defaultValue="overview" className="space-y-8">
    <TabsList className="bg-black/40">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="analytics">Analytics</TabsTrigger>
    </TabsList>
    
    <TabsContent value="overview" className="space-y-8">
      {/* ALL YOUR CURRENT DASHBOARD SECTIONS */}
    </TabsContent>
    
    <TabsContent value="analytics">
      <AnalyticsDashboard user={user} teamId={teamId} />
    </TabsContent>
  </Tabs>
</main>
```

That's it! Just those 2 changes add the full analytics dashboard.

---

## Testing Checklist

After integration, test:

- ✅ Can view analytics tab/page
- ✅ Date range selector works
- ✅ Data loads without errors
- ✅ Leaderboards show correct rankings
- ✅ Personal stats are accurate
- ✅ Break statistics calculate correctly
- ✅ Department comparison works (super admin)
- ✅ Refresh button updates data
- ✅ Loading states appear properly
- ✅ Empty states show when no data

---

## Troubleshooting

**Issue: "Function does not exist"**
- Run `supabase db push` to apply migration

**Issue: "Permission denied"**
- Check that user is authenticated
- Verify RLS policies on base tables

**Issue: "No data showing"**
- Check date ranges are correct
- Verify user has attendance records
- Ensure team_id is set correctly

**Issue: "Component not rendering"**
- Check all imports are correct
- Verify Tabs component is installed
- Check for console errors

---

## Next Steps After Integration

1. **Add Charts** - Use recharts or chart.js for visualizations
2. **Add Exports** - CSV/PDF export functionality
3. **Add Filters** - More granular filtering options
4. **Add Alerts** - Notify when metrics exceed thresholds
5. **Add Goals** - Set and track performance goals
6. **Add Comparisons** - Compare current vs previous periods

---

**Ready to integrate? Start with Option 1 (Tabs) - it's the easiest!**
