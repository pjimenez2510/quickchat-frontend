'use client';

import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatStore } from '@/stores/chat-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Message } from '@/types/message';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export function ForwardModal({ message, onClose }: ForwardModalProps) {
  const conversations = useChatStore((s) => s.conversations);
  const { socket } = useSocketContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleForward = () => {
    if (selected.size === 0 || !socket) return;
    setIsLoading(true);

    socket.emit(
      'message:forward',
      {
        messageId: message.id,
        targetConversationIds: Array.from(selected),
      },
      (response: { event: string; data: unknown }) => {
        setIsLoading(false);
        if (response?.event === 'message:forward:ack') {
          toast.success(`Forwarded to ${selected.size} conversation(s)`);
          onClose();
        } else {
          toast.error('Forward failed');
        }
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-background border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">Forward message</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message preview */}
        <div className="px-5 py-3 bg-accent/30 border-b border-border">
          <p className="text-xs text-muted-foreground">Message:</p>
          <p className="text-sm truncate mt-0.5">
            {message.type === 'TEXT' ? message.content : `📎 ${message.type.toLowerCase()}`}
          </p>
        </div>

        {/* Conversation list */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {conversations
            .filter((c) => c.id !== message.conversationId)
            .map((conv) => {
              const initials = conv.otherUser.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const isSelected = selected.has(conv.id);

              return (
                <button
                  key={conv.id}
                  onClick={() => toggle(conv.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.otherUser.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">{conv.otherUser.displayName}</span>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
              );
            })}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleForward} disabled={selected.size === 0 || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  );
}
