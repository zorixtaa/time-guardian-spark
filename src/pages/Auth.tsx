import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              display_name: displayName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: 'Welcome back',
          description: 'Successfully signed in',
        });
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-black/80 px-4 text-foreground">
      <div className="w-full max-w-sm space-y-8 rounded-3xl border border-yellow/10 bg-black/40 p-8 shadow-[0_0_35px_rgba(234,179,8,0.15)] backdrop-blur">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow/20 text-yellow mb-4">
            <svg
              className="w-6 h-6 text-yellow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Market Wave</h1>
          <p className="text-sm text-muted-foreground/80">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="h-11 rounded-xl border border-yellow/20 bg-black/40 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border border-yellow/20 bg-black/40 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-xl border border-yellow/20 bg-black/40 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-yellow text-yellow-foreground font-semibold shadow-[0_0_30px_rgba(234,179,8,0.25)] transition-all hover:-translate-y-0.5 hover:bg-yellow/90 hover:shadow-[0_0_40px_rgba(234,179,8,0.35)]"
            disabled={loading}
          >
            {loading ? 'Loading...' : isSignUp ? 'Continue' : 'Sign in'}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-yellow transition-colors hover:text-yellow/80"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
