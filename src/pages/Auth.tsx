import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

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
            emailRedirectTo: 'https://time-guardian-spark.vercel.app/dashboard',
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
    } catch (error: unknown) {
      toast({
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again with valid credentials.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://time-guardian-spark.vercel.app/dashboard',
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      toast({
        title: 'Google sign-in failed',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again with your Google account.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-black/80 px-4 text-foreground">
      <div className="w-full max-w-sm space-y-8 rounded-3xl border border-yellow/10 bg-black/40 p-8 shadow-[0_0_35px_rgba(234,179,8,0.15)] backdrop-blur">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src={logo}
              alt="Market Wave"
              className="h-16 w-auto"
            />
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

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-yellow/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black/40 px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full h-12 rounded-xl border border-yellow/20 bg-black/40 text-foreground font-semibold hover:bg-black/60 transition-all hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Loading...' : 'Continue with Google'}
        </Button>

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
