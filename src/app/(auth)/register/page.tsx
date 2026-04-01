'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse } from '@/types/user';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      'Must include uppercase, lowercase, and number',
    ),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  displayName: z.string().min(1, 'Required').max(50),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    if (!data.email && !data.phone) {
      toast.error('Email or phone number is required');
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
      };
      const res = await api.post<AuthResponse>('/auth/register', body);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success(res.message);
      router.refresh();
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create account</h2>
        <p className="text-muted-foreground mt-1">
          Join QuickChat and start messaging
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Identity fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="phone"
              placeholder="+593987654321"
              autoComplete="tel"
              className="h-11"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Profile fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="juan_perez"
              autoComplete="username"
              className="h-11"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Juan Perez"
              autoComplete="name"
              className="h-11"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-11 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Min. 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
