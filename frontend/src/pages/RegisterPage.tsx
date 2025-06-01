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
import { Dice1, Mail, Lock, AlertCircle, Check } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser, isAuthenticated, isGuest, convertGuestToUser, loading, createGuestSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
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

  const password = watch('password', '');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If guest, convert to user. Otherwise, register new user
      if (isGuest) {
        await convertGuestToUser(data.email, data.password);
      } else {
        await registerUser({
          email: data.email,
          password: data.password,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            Ready to give randomness meaning?
          </p>
        </div>

        {/* Registration Form */}
        <Card className="matsu-card border-[oklch(0.74_0.063_80.8)]">
          <CardHeader>
            <CardTitle className="text-[oklch(0.29_0.086_109)]">{isGuest ? 'Save Your Progress' : 'Create Account'}</CardTitle>
            <CardDescription className="text-[oklch(0.51_0.077_74.3)]">
              {isGuest 
                ? 'Convert your guest account to save decisions across devices' 
                : 'Start making better decisions through probability'
              }
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
              
              {isGuest && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[oklch(0.71_0.097_111.7)]/10 text-[oklch(0.29_0.086_109)] border border-[oklch(0.71_0.097_111.7)]/20">
                  <Dice1 className="w-4 h-4 mt-0.5" />
                  <span className="text-sm">All your current decisions will be saved to your new account!</span>
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
                  placeholder="Create a password"
                  {...register('password')}
                  className={errors.password ? 'border-[oklch(0.54_0.19_29.2)]' : 'border-[oklch(0.74_0.063_80.8)] focus:border-[oklch(0.71_0.097_111.7)]'}
                />
                {password && (
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                          req.met ? 'bg-[oklch(0.71_0.097_111.7)]' : 'bg-[oklch(0.74_0.063_80.8)]'
                        }`}>
                          {req.met && <Check className="w-2 h-2 text-white" />}
                        </div>
                        <span className={req.met ? 'text-[oklch(0.71_0.097_111.7)]' : 'text-[oklch(0.51_0.077_74.3)]'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-[oklch(0.54_0.19_29.2)]">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[oklch(0.29_0.086_109)]">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-[oklch(0.54_0.19_29.2)]' : 'border-[oklch(0.74_0.063_80.8)] focus:border-[oklch(0.71_0.097_111.7)]'}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-[oklch(0.54_0.19_29.2)]">{errors.confirmPassword.message}</p>
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
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-[oklch(0.51_0.077_74.3)]">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    className="text-[oklch(0.71_0.097_111.7)] hover:text-[oklch(0.71_0.097_111.7)]/80 font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
              
              {!isGuest && (
                <>
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
                      } catch {
                        // Guest session creation failed - user stays on register page
                      }
                    }}
                  >
                    Continue as Guest
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
