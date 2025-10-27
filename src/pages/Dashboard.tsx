import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendanceState } from '@/hooks/useAttendanceState';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { state, currentAttendance, activeBreak, refresh } = useAttendanceState(user?.id);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate('/auth');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
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
      refresh();
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
    if (!currentAttendance) return;
    setActionLoading(true);
    try {
      await checkOut(currentAttendance.id);
      toast({
        title: 'Checked Out!',
        description: 'Have a great day!',
      });
      refresh();
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
      refresh();
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
    if (!activeBreak) return;
    setActionLoading(true);
    try {
      await endBreak(activeBreak.id);
      toast({
        title: 'Break Ended',
        description: 'Welcome back!',
      });
      refresh();
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
      refresh();
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
    if (!activeBreak) return;
    setActionLoading(true);
    try {
      await endLunch(activeBreak.id);
      toast({
        title: 'Lunch Ended',
        description: 'Back to work!',
      });
      refresh();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-yellow flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Market Wave</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>Your real-time attendance state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StateIndicator state={state} />
            
            {state === 'checked_in' && currentAttendance && (
              <div className="text-sm text-muted-foreground">
                Checked in at {new Date(currentAttendance.clock_in_at).toLocaleTimeString()}
              </div>
            )}
            
            {(state === 'on_break' || state === 'on_lunch') && activeBreak && (
              <div className="text-sm text-muted-foreground">
                Started at {new Date(activeBreak.started_at).toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage your attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButtons
              state={state}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onStartLunch={handleStartLunch}
              onEndLunch={handleEndLunch}
              loading={actionLoading}
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-yellow/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Worked Today</p>
                  <p className="text-2xl font-bold">0h 0m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-yellow" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Break Time</p>
                  <p className="text-2xl font-bold">0m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow to-yellow-light flex items-center justify-center">
                  <Target className="w-6 h-6 text-yellow-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold">0 days</p>
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
