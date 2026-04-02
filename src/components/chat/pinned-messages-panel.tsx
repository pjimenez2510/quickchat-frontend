'use client';

import { useEffect, useState } from 'react';
import { X, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { formatMessageTime } from '@/lib/format';
import type { Message } from '@/types/message';

interface PinnedMessagesPanelProps {
  conversationId: string;
  onClose: () => void;
  onNavigate: (messageId: string) => void;
}

export function PinnedMessagesPanel({
  conversationId,
  onClose,
  onNavigate,
}: PinnedMessagesPanelProps) {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Message[]>(`/messages/conversation/${conversationId}/pinned`)
      .then((res) => setPinnedMessages(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  return (
    <div className="border-b border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-accent/30">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Pinned Messages ({pinnedMessages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-[250px] overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : pinnedMessages.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No pinned messages
          </p>
        ) : (
          pinnedMessages.map((msg) => {
            const initials = msg.sender.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <button
                key={msg.id}
                onClick={() => {
                  onNavigate(msg.id);
                  onClose();
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
              >
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarImage src={msg.sender.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {msg.sender.displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {msg.type === 'TEXT'
                      ? msg.content
                      : `📎 ${msg.type.toLowerCase()}`}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
