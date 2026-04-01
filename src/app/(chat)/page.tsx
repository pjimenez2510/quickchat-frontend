'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      const res = await api.post<null>('/auth/logout');
      toast.success(res.message);
    } catch {
      // Logout even if API call fails
    } finally {
      clearAuth();
      router.refresh();
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-primary">QuickChat</h1>
        <p className="text-muted-foreground">
          Welcome, {user?.displayName ?? 'User'}!
        </p>
        <p className="text-sm text-muted-foreground">
          @{user?.username}
        </p>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
