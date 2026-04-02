'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Reply,
  Pencil,
  Trash2,
  Pin,
  Forward,
  Copy,
  SmilePlus,
} from 'lucide-react';
import type { Message } from '@/types/message';

interface ContextMenuProps {
  message: Message;
  isOwn: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForAll: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function ContextMenu({
  message,
  isOwn,
  position,
  onClose,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForAll,
  onPin,
  onReact,
  onCopy,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const canEdit =
    isOwn &&
    message.type === 'TEXT' &&
    Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded-xl border border-border bg-background shadow-lg py-1"
      style={{
        top: Math.min(position.y, window.innerHeight - 350),
        left: Math.min(position.x, window.innerWidth - 200),
      }}
    >
      {/* Quick reactions */}
      <div className="flex gap-1 px-2 py-2 border-b border-border">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onReact(emoji); onClose(); }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-accent transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="py-1">
        <MenuItem icon={Reply} label="Reply" onClick={() => { onReply(); onClose(); }} />
        {message.type === 'TEXT' && (
          <MenuItem icon={Copy} label="Copy" onClick={() => { onCopy(); onClose(); }} />
        )}
        {canEdit && (
          <MenuItem icon={Pencil} label="Edit" onClick={() => { onEdit(); onClose(); }} />
        )}
        <MenuItem icon={Pin} label={message.isPinned ? 'Unpin' : 'Pin'} onClick={() => { onPin(); onClose(); }} />
        <MenuItem icon={Trash2} label="Delete for me" onClick={() => { onDeleteForMe(); onClose(); }} destructive />
        {isOwn && (
          <MenuItem icon={Trash2} label="Delete for everyone" onClick={() => { onDeleteForAll(); onClose(); }} destructive />
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-accent'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
