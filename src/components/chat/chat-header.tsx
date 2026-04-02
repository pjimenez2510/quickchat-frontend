'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Pin, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/format';

interface ChatHeaderProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  isTyping: boolean;
  onTogglePinned: () => void;
  showPinned: boolean;
  onToggleSearch: () => void;
  showSearch: boolean;
}

export function ChatHeader({
  displayName,
  avatarUrl,
  isOnline,
  lastSeenAt,
  isTyping,
  onTogglePinned,
  showPinned,
  onToggleSearch,
  showSearch,
}: ChatHeaderProps) {
  const router = useRouter();

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const statusText = isTyping
    ? 'Typing...'
    : isOnline
      ? 'Online'
      : lastSeenAt
        ? `Last seen ${formatRelativeTime(lastSeenAt)}`
        : 'Offline';

  return (
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
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background"
            style={{ backgroundColor: 'var(--qc-online)' }}
          />
        )}
      </div>

      <div className="flex-1">
        <h2 className="text-sm font-semibold leading-tight">{displayName}</h2>
        <p
          className="text-xs leading-tight"
          style={{
            color: isTyping
              ? 'var(--qc-bubble-sent)'
              : isOnline
                ? 'var(--qc-online)'
                : 'var(--muted-foreground)',
          }}
        >
          {statusText}
        </p>
      </div>

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
    </div>
  );
}
