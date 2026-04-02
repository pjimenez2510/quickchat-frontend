'use client';

import { Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageStatus } from './message-status';
import type { Message } from '@/types/message';
import { formatMessageTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function MessageBubble({ message, isOwn, showAvatar, onContextMenu }: MessageBubbleProps) {
  if (message.deletedForAll) {
    return (
      <div className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
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
    <div
      className={cn(
        'flex gap-2 mb-0.5',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        showAvatar && !isOwn && 'mt-3',
      )}
      onContextMenu={onContextMenu}
    >
      {/* Avatar column - only for received messages */}
      {!isOwn && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('max-w-[65%]', isOwn && 'mr-1')}>
        {/* Sender name for received messages (first in group) */}
        {!isOwn && showAvatar && (
          <p className="text-xs font-medium text-muted-foreground mb-1 ml-1">
            {message.sender.displayName}
          </p>
        )}

        {/* Pinned indicator */}
        {message.isPinned && (
          <div className={cn('flex items-center gap-1 mb-1 px-1', isOwn ? 'justify-end' : 'justify-start')}>
            <Pin className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Pinned</span>
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div
            className={cn(
              'mb-1 rounded-xl px-3 py-1.5 text-xs border-l-2',
              isOwn
                ? 'bg-blue-400/30 border-white/50 text-white/90'
                : 'bg-muted border-primary/50 text-muted-foreground',
            )}
          >
            <p className="truncate">{message.replyTo.content ?? 'Media'}</p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl text-[14px] leading-relaxed',
            message.type === 'STICKER'
              ? 'px-1 py-1'
              : cn(
                  'px-4 py-2 shadow-sm',
                  isOwn ? 'rounded-br-md' : 'rounded-bl-md',
                ),
          )}
          style={
            message.type === 'STICKER'
              ? {}
              : {
                  backgroundColor: isOwn
                    ? 'var(--qc-bubble-sent)'
                    : 'var(--qc-bubble-received)',
                  color: isOwn
                    ? 'var(--qc-bubble-sent-text)'
                    : 'var(--qc-bubble-received-text)',
                }
          }
        >
          {message.type === 'TEXT' && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {message.type === 'IMAGE' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="Image"
              className="max-w-full rounded-lg"
            />
          )}
          {message.type === 'GIF' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="GIF"
              className="max-w-[250px] rounded-lg"
            />
          )}
          {message.type === 'STICKER' && (
            <span className="text-5xl leading-none">{message.content}</span>
          )}
          {message.type === 'VIDEO' && message.mediaUrl && (
            <video
              src={message.mediaUrl}
              controls
              className="max-w-[300px] rounded-lg"
              preload="metadata"
            />
          )}
          {(message.type === 'AUDIO' || message.type === 'VOICE') && message.mediaUrl && (
            <audio src={message.mediaUrl} controls className="max-w-[250px]" preload="metadata" />
          )}
          {message.type === 'FILE' && message.mediaUrl && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 underline',
                isOwn ? 'text-white/90' : 'text-primary',
              )}
            >
              📎 {message.content ?? 'File'}
            </a>
          )}
          {!['TEXT', 'IMAGE', 'GIF', 'STICKER', 'VIDEO', 'AUDIO', 'VOICE', 'FILE'].includes(message.type) && (
            <p className="italic">{message.content}</p>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1 px-1', isOwn ? 'justify-end' : 'justify-start')}>
            {Object.entries(
              message.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-xs"
              >
                {emoji} {count > 1 && <span className="text-muted-foreground">{count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp + edited */}
        <div
          className={cn(
            'flex items-center gap-1 mt-0.5 px-1',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="text-[11px] text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-[11px] text-muted-foreground">(edited)</span>
          )}
          {isOwn && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}
