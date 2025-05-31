import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Dice1, Mail, Lock, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isAuthenticated, isGuest, loading, createGuestSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  if (isAuthenticated && !isGuest) {
    return <Navigate to="/" replace />;
  }
  
  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="matsu-app min-h-screen flex items-center justify-center">
        <div className="texture"></div>
        <div className="relative z-10">
          <div className="animate-spin h-8 w-8 border-2 border-[oklch(0.71_0.097_111.7)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="matsu-app min-h-screen flex flex-col sm:justify-center p-4 pt-8 sm:pt-4">
      <div className="texture"></div>
      <div className="relative z-10 w-full max-w-md mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2 sm:mb-4">
            <Dice1 className="w-8 h-8 text-[oklch(0.71_0.097_111.7)]" />
            <h1 className="text-3xl font-bold text-[oklch(0.29_0.086_109)]">Aleator</h1>
          </div>
          <p className="text-[oklch(0.51_0.077_74.3)]">
            Welcome back to mindful randomness
          </p>
        </div>

        {/* Login Form */}
        <Card className="matsu-card border-[oklch(0.74_0.063_80.8)]">
          <CardHeader>
            <CardTitle className="text-[oklch(0.29_0.086_109)]">Sign In</CardTitle>
            <CardDescription className="text-[oklch(0.51_0.077_74.3)]">
              Enter your credentials to access your decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[oklch(0.54_0.19_29.2)]/10 text-[oklch(0.54_0.19_29.2)] border border-[oklch(0.54_0.19_29.2)]/20">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-[oklch(0.29_0.086_109)]">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                  className={errors.email ? 'border-[oklch(0.54_0.19_29.2)]' : 'border-[oklch(0.74_0.063_80.8)] focus:border-[oklch(0.71_0.097_111.7)]'}
                />
                {errors.email && (
                  <p className="text-sm text-[oklch(0.54_0.19_29.2)]">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-[oklch(0.29_0.086_109)]">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register('password')}
                  className={errors.password ? 'border-[oklch(0.54_0.19_29.2)]' : 'border-[oklch(0.74_0.063_80.8)] focus:border-[oklch(0.71_0.097_111.7)]'}
                />
                {errors.password && (
                  <p className="text-sm text-[oklch(0.54_0.19_29.2)]">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full matsu-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-[oklch(0.51_0.077_74.3)]">
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    className="text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.71_0.097_111.7)]/80 font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[oklch(0.74_0.063_80.8)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[oklch(0.94_0.035_83.6)] px-2 text-[oklch(0.51_0.077_74.3)]">Or</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full matsu-button"
                onClick={async () => {
                  try {
                    await createGuestSession();
                    navigate('/');
                  } catch (error) {
                    console.error('Failed to create guest session:', error);
                  }
                }}
              >
                Continue as Guest
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}