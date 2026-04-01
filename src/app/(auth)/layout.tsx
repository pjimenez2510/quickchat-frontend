'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.refresh();
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
        style={{ backgroundColor: 'var(--qc-bubble-sent)' }}
      >
        <div className="max-w-md text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold">QuickChat</h1>
          </div>
          <p className="text-xl text-white/90 leading-relaxed">
            Connect instantly with friends and family. Fast, simple, and secure messaging.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold">Real-time</p>
              <p className="text-white/70 text-sm">Instant delivery</p>
            </div>
            <div>
              <p className="text-2xl font-bold">Secure</p>
              <p className="text-white/70 text-sm">JWT auth</p>
            </div>
            <div>
              <p className="text-2xl font-bold">Simple</p>
              <p className="text-white/70 text-sm">Clean design</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--qc-bubble-sent)' }}
            >
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary">QuickChat</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
