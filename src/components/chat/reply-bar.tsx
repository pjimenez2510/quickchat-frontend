'use client';

import { X } from 'lucide-react';
import type { Message } from '@/types/message';

interface ReplyBarProps {
  message: Message;
  onCancel: () => void;
}

export function ReplyBar({ message, onCancel }: ReplyBarProps) {
  return (
    <div className="flex items-center gap-2 border-t border-border bg-accent/30 px-4 py-2">
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
        <p className="text-xs font-medium text-primary">
          {message.sender.displayName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {message.type === 'TEXT'
            ? message.content
            : message.type.toLowerCase()}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="shrink-0 rounded-full p-1 hover:bg-accent transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
