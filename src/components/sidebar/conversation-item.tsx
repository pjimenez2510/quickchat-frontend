'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation } from '@/types/conversation';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
}: ConversationItemProps) {
  const { otherUser, lastMessage } = conversation;
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherUser.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {otherUser.isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background"
            style={{ backgroundColor: 'var(--qc-online)' }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold">
            {otherUser.displayName}
          </span>
          {lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {lastMessagePreview}
        </p>
      </div>
    </button>
  );
}
