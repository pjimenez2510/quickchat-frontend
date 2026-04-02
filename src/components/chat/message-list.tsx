'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { MessageBubble } from './message-bubble';
import { ContextMenu } from './context-menu';
import { EditMessageModal } from './edit-message-modal';
import { useSocketContext } from '@/components/providers/socket-provider';
import { useChatStore } from '@/stores/chat-store';
import type { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const { socket } = useSocketContext();

  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0 && prevLengthRef.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, message: Message) => {
      e.preventDefault();
      setContextMenu({ message, position: { x: e.clientX, y: e.clientY } });
    },
    [],
  );

  const handleReply = useCallback(() => {
    if (contextMenu) {
      useChatStore.getState().setReplyTo(contextMenu.message);
    }
  }, [contextMenu]);

  const handleEdit = useCallback(() => {
    if (!contextMenu) return;
    setEditingMessage(contextMenu.message);
  }, [contextMenu]);

  const handleEditSave = useCallback(
    (newContent: string) => {
      if (!editingMessage || !socket) return;
      socket.emit('message:edit', {
        messageId: editingMessage.id,
        content: newContent,
      });
      setEditingMessage(null);
    },
    [editingMessage, socket],
  );

  const handleDeleteForMe = useCallback(() => {
    if (!contextMenu || !socket) return;
    socket.emit('message:delete', {
      messageId: contextMenu.message.id,
      deleteForAll: false,
    });
    useChatStore
      .getState()
      .removeMessage(contextMenu.message.conversationId, contextMenu.message.id);
    toast.success('Message deleted for you');
  }, [contextMenu, socket]);

  const handleDeleteForAll = useCallback(() => {
    if (!contextMenu || !socket) return;
    socket.emit('message:delete', {
      messageId: contextMenu.message.id,
      deleteForAll: true,
    });
  }, [contextMenu, socket]);

  const handlePin = useCallback(() => {
    if (!contextMenu) return;
    const { id } = contextMenu.message;
    fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002'}/messages/${id}/pin`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    }).then(() => {
      toast.success(contextMenu.message.isPinned ? 'Message unpinned' : 'Message pinned');
    });
  }, [contextMenu]);

  const handleReact = useCallback(
    (emoji: string) => {
      if (!contextMenu || !socket) return;
      socket.emit('message:reaction', {
        messageId: contextMenu.message.id,
        emoji,
      });
    },
    [contextMenu, socket],
  );

  const handleCopy = useCallback(() => {
    if (!contextMenu?.message.content) return;
    navigator.clipboard.writeText(contextMenu.message.content);
    toast.success('Copied to clipboard');
  }, [contextMenu]);

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
                onContextMenu={(e) => handleContextMenu(e, msg)}
              />
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {editingMessage && (
        <EditMessageModal
          content={editingMessage.content ?? ''}
          onSave={handleEditSave}
          onClose={() => setEditingMessage(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          message={contextMenu.message}
          isOwn={contextMenu.message.sender.id === currentUserId}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onReply={handleReply}
          onEdit={handleEdit}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForAll={handleDeleteForAll}
          onPin={handlePin}
          onReact={handleReact}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}
