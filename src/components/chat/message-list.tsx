'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import type { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on first load
  useEffect(() => {
    if (messages.length > 0 && prevLengthRef.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Say hello!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
    >
      <div className="flex flex-col justify-end min-h-full">
        <div className="space-y-0.5">
          {messages.map((msg, i) => {
            const isOwn = msg.sender.id === currentUserId;
            const prevMsg = messages[i - 1];
            const showAvatar =
              !isOwn && (!prevMsg || prevMsg.sender.id !== msg.sender.id);

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
              />
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
