'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArchiveRestore, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';
import type { Conversation } from '@/types/conversation';

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ArchivedPage() {
  const router = useRouter();
  const [archived, setArchived] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const reload = () => {
    setIsLoading(true);
    api
      .get<Conversation[]>('/conversations/archived')
      .then((res) => setArchived(res.data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to load archived chats'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(reload, []);

  const handleUnarchive = async (c: Conversation) => {
    setActing(c.id);
    try {
      const res = await api.patch<null>(`/conversations/${c.id}/unarchive`);
      toast.success(res.message);
      setArchived((prev) => prev.filter((x) => x.id !== c.id));
      // Inject back into the sidebar list
      useChatStore.setState((state) => {
        const exists = state.conversations.find((x) => x.id === c.id);
        if (exists) return state;
        return {
          conversations: [{ ...c, isArchived: false }, ...state.conversations],
        };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unarchive');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => router.push('/')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Archived chats</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
          </div>
        ) : archived.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No archived chats.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {archived.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={c.otherUser.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initialsOf(c.otherUser.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.otherUser.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessage?.content ?? 'No messages yet'}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/chat/${c.id}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors"
                  title="Open chat"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnarchive(c)}
                  disabled={acting === c.id}
                >
                  {acting === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
