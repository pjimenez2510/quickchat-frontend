'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, Mail, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Conversation } from '@/types/conversation';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}

const RECENT_THRESHOLD_MS = 5 * 60 * 1000;

function getActivityLabel(
  isOnline: boolean,
  lastSeenAt: string | null,
): { text: string; tone: 'online' | 'recent' | 'offline' } {
  if (isOnline) return { text: 'Online', tone: 'online' };
  if (lastSeenAt) {
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    if (diff >= 0 && diff < RECENT_THRESHOLD_MS) {
      return { text: 'Recently active', tone: 'recent' };
    }
  }
  return { text: '', tone: 'offline' };
}

export function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
}: ConversationItemProps) {
  const { otherUser, lastMessage, isUnread, isArchived } = conversation;
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = otherUser.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const lastMessagePreview = lastMessage
    ? lastMessage.type !== 'TEXT'
      ? `📎 ${lastMessage.type.toLowerCase()}`
      : lastMessage.senderId === currentUserId
        ? `You: ${lastMessage.content}`
        : lastMessage.content
    : 'No messages yet';

  const activity = getActivityLabel(otherUser.isOnline, otherUser.lastSeenAt);
  const recentDot = activity.tone === 'recent';

  const handleArchive = async () => {
    try {
      const res = await api.patch<null>(`/conversations/${conversation.id}/archive`);
      toast.success(res.message);
      useChatStore.getState().archiveConversation(conversation.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive');
    }
  };

  const handleUnarchive = async () => {
    try {
      const res = await api.patch<null>(`/conversations/${conversation.id}/unarchive`);
      toast.success(res.message);
      useChatStore.getState().unarchiveConversation(conversation.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unarchive');
    }
  };

  const handleMarkUnread = async () => {
    try {
      const res = await api.patch<null>(`/conversations/${conversation.id}/unread`);
      toast.success(res.message);
      useChatStore.getState().markConversationUnread(conversation.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark unread');
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all cursor-pointer',
        isActive
          ? 'bg-primary/10 border-l-[3px] border-primary'
          : 'hover:bg-accent border-l-[3px] border-transparent',
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherUser.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {otherUser.isOnline && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-[var(--qc-online)]" />
        )}
        {!otherUser.isOnline && recentDot && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-amber-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              isActive && 'text-primary',
            )}
          >
            {otherUser.displayName}
          </span>
          {lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p
            className={cn(
              'truncate text-xs',
              isUnread ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}
          >
            {otherUser.customStatus && !lastMessage ? (
              <span className="inline-flex items-center gap-1">
                {otherUser.customStatusEmoji && <span>{otherUser.customStatusEmoji}</span>}
                <span className="italic">{otherUser.customStatus}</span>
              </span>
            ) : (
              lastMessagePreview
            )}
          </p>
          {isUnread && (
            <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            className="opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!isArchived && (
              <DropdownMenuItem onClick={handleMarkUnread}>
                <Mail className="h-4 w-4 mr-2" /> Mark as unread
              </DropdownMenuItem>
            )}
            {isArchived ? (
              <DropdownMenuItem onClick={handleUnarchive}>
                <ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" /> Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
