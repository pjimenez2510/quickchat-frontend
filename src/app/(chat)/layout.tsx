'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { SocketProvider } from '@/components/providers/socket-provider';
import { SocketConnector } from '@/components/providers/socket-connector';
import { Sidebar } from '@/components/sidebar/sidebar';
import { api } from '@/lib/api';
import type { User } from '@/types/user';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, setUser, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const isInConversation = pathname?.startsWith('/chat/');

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

    if (!token && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (token && !isAuthenticated) {
      useAuthStore.setState({
        accessToken: token,
        isAuthenticated: true,
      });
    }

    api
      .get<{ user: User }>('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setIsLoading(false);
      })
      .catch(() => {
        clearAuth();
        router.refresh();
        router.push('/login');
      });
  }, [isAuthenticated, router, setUser, clearAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">QuickChat</h1>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <SocketConnector>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar: always visible on desktop, toggle on mobile */}
          <div className={`w-full md:w-[360px] shrink-0 md:block ${isInConversation ? 'hidden md:block' : 'block'}`}>
            <Sidebar />
          </div>
          {/* Chat panel: always visible on desktop, toggle on mobile */}
          <div className={`flex-1 min-w-0 ${isInConversation ? 'block' : 'hidden md:block'}`}>
            {children}
          </div>
        </div>
      </SocketConnector>
    </SocketProvider>
  );
}
