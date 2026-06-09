'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pin, Search, Phone, Video, MoreVertical, Ban, UserMinus, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/format';
import { useCall } from '@/hooks/use-call';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';

interface ChatHeaderProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  customStatus: string | null;
  customStatusEmoji: string | null;
  otherUserId: string;
  isTyping: boolean;
  conversationId: string;
  onTogglePinned: () => void;
  showPinned: boolean;
  onToggleSearch: () => void;
  showSearch: boolean;
}

const RECENT_THRESHOLD_MS = 5 * 60 * 1000;

function activityText(
  isTyping: boolean,
  isOnline: boolean,
  lastSeenAt: string | null,
): { text: string; tone: 'typing' | 'online' | 'recent' | 'offline' } {
  if (isTyping) return { text: 'Typing...', tone: 'typing' };
  if (isOnline) return { text: 'Online', tone: 'online' };
  if (lastSeenAt) {
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    if (diff >= 0 && diff < RECENT_THRESHOLD_MS) {
      return { text: 'Recently active', tone: 'recent' };
    }
    return { text: `Last seen ${formatRelativeTime(lastSeenAt)}`, tone: 'offline' };
  }
  return { text: 'Offline', tone: 'offline' };
}

export function ChatHeader({
  displayName,
  avatarUrl,
  isOnline,
  lastSeenAt,
  customStatus,
  customStatusEmoji,
  otherUserId,
  isTyping,
  conversationId,
  onTogglePinned,
  showPinned,
  onToggleSearch,
  showSearch,
}: ChatHeaderProps) {
  const router = useRouter();
  const { startCall } = useCall();
  const [confirm, setConfirm] = useState<null | 'block' | 'remove' | 'archive'>(null);

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activity = activityText(isTyping, isOnline, lastSeenAt);

  const handleBlock = async () => {
    try {
      const res = await api.post<null>('/blocked-users', { blockedUserId: otherUserId });
      toast.success(res.message);
      useChatStore.setState((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
      }));
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to block');
    } finally {
      setConfirm(null);
    }
  };

  const handleRemove = async () => {
    try {
      const res = await api.delete<null>(`/contacts/${otherUserId}`);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove contact');
    } finally {
      setConfirm(null);
    }
  };

  const handleArchive = async () => {
    try {
      const res = await api.patch<null>(`/conversations/${conversationId}/archive`);
      toast.success(res.message);
      useChatStore.getState().archiveConversation(conversationId);
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setConfirm(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        {/* Back button - mobile only */}
        <button
          onClick={() => router.push('/')}
          className="flex md:hidden h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-[var(--qc-online)]" />
          )}
          {!isOnline && activity.tone === 'recent' && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold leading-tight truncate">{displayName}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p
              className={cn(
                'text-xs leading-tight truncate',
                activity.tone === 'typing'
                  ? 'text-[var(--qc-bubble-sent)]'
                  : activity.tone === 'online'
                    ? 'text-[var(--qc-online)]'
                    : activity.tone === 'recent'
                      ? 'text-amber-600'
                      : 'text-muted-foreground',
              )}
            >
              {activity.text}
            </p>
            {customStatus && (
              <span className="text-xs text-muted-foreground truncate">
                · {customStatusEmoji ? `${customStatusEmoji} ` : ''}
                <span className="italic">{customStatus}</span>
              </span>
            )}
          </div>
        </div>

        {/* Voice call */}
        <button
          onClick={() => startCall(conversationId, 'AUDIO')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
          title="Voice call"
        >
          <Phone className="h-4 w-4" />
        </button>

        {/* Video call */}
        <button
          onClick={() => startCall(conversationId, 'VIDEO')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
          title="Video call"
        >
          <Video className="h-4 w-4" />
        </button>

        {/* Search toggle */}
        <button
          onClick={onToggleSearch}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            showSearch ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
          }`}
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Pinned messages toggle */}
        <button
          onClick={onTogglePinned}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            showPinned ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
          }`}
          title="Pinned messages"
        >
          <Pin className="h-4 w-4" />
        </button>

        {/* Conversation menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setConfirm('archive')}>
              <Archive className="h-4 w-4 mr-2" /> Archive chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirm('remove')}>
              <UserMinus className="h-4 w-4 mr-2" /> Remove contact
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirm('block')}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" /> Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm === 'block'
                ? `Block ${displayName}?`
                : confirm === 'remove'
                  ? `Remove ${displayName} from contacts?`
                  : 'Archive this chat?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'block'
                ? `They won't be able to message you, see your profile or activity status.`
                : confirm === 'remove'
                  ? `They won't be notified. You can add them back later.`
                  : `It will be hidden from your main list. Send a message to bring it back.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm === 'block' ? 'destructive' : 'default'}
              onClick={
                confirm === 'block'
                  ? handleBlock
                  : confirm === 'remove'
                    ? handleRemove
                    : handleArchive
              }
            >
              {confirm === 'block'
                ? 'Block'
                : confirm === 'remove'
                  ? 'Remove'
                  : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
