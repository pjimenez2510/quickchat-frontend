'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, LogOut, MessageCircle, User, Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ConversationItem } from './conversation-item';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/conversation';

type SidebarView = 'active' | 'archived';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const { conversations, archivedConversations, setArchivedConversations } = useChatStore();
  const activeConversationId = pathname?.startsWith('/chat/') ? pathname.split('/chat/')[1] : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; username: string; displayName: string; avatarUrl: string | null; isOnline: boolean }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<SidebarView>('active');
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [hasFetchedArchived, setHasFetchedArchived] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      api
        .get<{ id: string; username: string; displayName: string; avatarUrl: string | null; isOnline: boolean }[]>(
          `/users/search?q=${encodeURIComponent(searchQuery)}`,
        )
        .then((res) => setSearchResults(res.data))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Fetch archived once on first switch to that view; refetch when switching back if user wants freshness
  useEffect(() => {
    if (view !== 'archived' || hasFetchedArchived) return;
    setIsLoadingArchived(true);
    api
      .get<Conversation[]>('/conversations/archived')
      .then((res) => {
        setArchivedConversations(res.data);
        setHasFetchedArchived(true);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to load archived chats'),
      )
      .finally(() => setIsLoadingArchived(false));
  }, [view, hasFetchedArchived, setArchivedConversations]);

  const handleStartConversation = async (otherUserId: string) => {
    try {
      const res = await api.post<Conversation>('/conversations', {
        otherUserId,
      });

      useChatStore.setState((state) => {
        const exists = state.conversations.find((c) => c.id === res.data.id);
        if (exists) return state;
        return { conversations: [res.data, ...state.conversations] };
      });

      setSearchQuery('');
      setSearchResults([]);
      setView('active');
      router.push(`/chat/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start conversation');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post<null>('/auth/logout');
      toast.success('Logged out successfully');
    } catch {
      // Logout even if API fails
    } finally {
      clearAuth();
      router.refresh();
      router.push('/login');
    }
  };

  const list = view === 'active' ? conversations : archivedConversations;
  const emptyMessage = view === 'active'
    ? 'No conversations yet.\nSearch for users to start chatting!'
    : 'No archived chats.';

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Chats</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings/profile')} title="Edit profile">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="h-9 pl-9 bg-accent/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* View tabs: active vs archived */}
      {!searchQuery.trim() && (
        <div className="px-3 pb-2 flex gap-1">
          <button
            type="button"
            onClick={() => setView('active')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 h-9 rounded-full text-sm transition-colors',
              view === 'active'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent',
            )}
            title="Active chats"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chats</span>
            {conversations.length > 0 && (
              <span className="ml-1 text-xs opacity-70">{conversations.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView('archived')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 h-9 rounded-full text-sm transition-colors',
              view === 'archived'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent',
            )}
            title="Archived chats"
          >
            <Archive className="h-4 w-4" />
            <span>Archived</span>
            {hasFetchedArchived && archivedConversations.length > 0 && (
              <span className="ml-1 text-xs opacity-70">{archivedConversations.length}</span>
            )}
          </button>
        </div>
      )}

      <Separator />

      {/* Search results or conversation list */}
      <ScrollArea className="flex-1">
        {searchQuery.trim() ? (
          <div className="p-2">
            {isSearching ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Searching...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No users found
              </p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartConversation(u.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-medium text-primary">
                      {u.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : view === 'archived' && isLoadingArchived ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading archived...
          </div>
        ) : (
          <div className="p-2">
            {list.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground whitespace-pre-line">
                {emptyMessage}
              </p>
            ) : (
              list.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  currentUserId={user?.id ?? ''}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                />
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
