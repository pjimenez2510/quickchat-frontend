'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Message } from '@/types/message';
import { formatMessageTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  if (message.deletedForAll) {
    return (
      <div className={cn('flex mb-1', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl px-4 py-2 text-sm italic text-muted-foreground bg-muted">
          Message deleted
        </div>
      </div>
    );
  }

  const initials = message.sender.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn('flex gap-2 mb-1', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className="max-w-[70%]">
        {/* Reply reference */}
        {message.replyTo && (
          <div
            className={cn(
              'mb-1 rounded-lg px-3 py-1.5 text-xs border-l-2',
              isOwn
                ? 'bg-primary/20 border-white/50 text-white/80'
                : 'bg-muted border-primary/50 text-muted-foreground',
            )}
          >
            <p className="truncate">{message.replyTo.content ?? 'Media'}</p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm leading-relaxed',
            isOwn
              ? 'text-white'
              : 'text-foreground',
          )}
          style={{
            backgroundColor: isOwn
              ? 'var(--qc-bubble-sent)'
              : 'var(--qc-bubble-received)',
          }}
        >
          {message.type === 'TEXT' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.type === 'IMAGE' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="Image"
              className="max-w-full rounded-lg"
            />
          )}
          {message.type !== 'TEXT' && message.type !== 'IMAGE' && (
            <p className="italic">
              {message.type.toLowerCase()} {message.content && `— ${message.content}`}
            </p>
          )}
        </div>

        {/* Timestamp + edited */}
        <div className={cn('flex items-center gap-1 mt-0.5 px-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className="text-[11px] text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-[11px] text-muted-foreground">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
}
