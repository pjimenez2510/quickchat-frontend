'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: string;
}

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function BlockedPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toUnblock, setToUnblock] = useState<BlockedUser | null>(null);

  const reload = () => {
    setIsLoading(true);
    api
      .get<BlockedUser[]>('/blocked-users')
      .then((res) => setBlocked(res.data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to load blocked users'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(reload, []);

  const handleUnblock = async () => {
    if (!toUnblock) return;
    try {
      const res = await api.delete<null>(`/blocked-users/${toUnblock.id}`);
      toast.success(res.message);
      setBlocked((prev) => prev.filter((b) => b.id !== toUnblock.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unblock');
    } finally {
      setToUnblock(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => router.push('/settings/profile')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Blocked users</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
          </div>
        ) : blocked.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            You haven&apos;t blocked anyone.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {blocked.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={b.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initialsOf(b.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{b.username}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setToUnblock(b)}>
                  <ShieldOff className="h-4 w-4 mr-2" /> Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!toUnblock} onOpenChange={(o) => !o && setToUnblock(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unblock user?</DialogTitle>
            <DialogDescription>
              {toUnblock
                ? `${toUnblock.displayName} will be able to message you again and see your profile and activity status.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToUnblock(null)}>
              Cancel
            </Button>
            <Button onClick={handleUnblock}>Unblock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
