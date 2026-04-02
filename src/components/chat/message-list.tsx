'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { toast } from 'sonner';
import { MessageBubble } from './message-bubble';
import { ContextMenu } from './context-menu';
import { EditMessageModal } from './edit-message-modal';
import { ForwardModal } from './forward-modal';
import { useSocketContext } from '@/components/providers/socket-provider';
import { useChatStore } from '@/stores/chat-store';
import { api } from '@/lib/api';
import type { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => void;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList({ messages, currentUserId }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(0);
    const { socket } = useSocketContext();

    const [contextMenu, setContextMenu] = useState<{
      message: Message;
      position: { x: number; y: number };
    } | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const hasMoreRef = useRef(true);

    useImperativeHandle(ref, () => ({
      scrollToMessage: (messageId: string) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(messageId);
          setTimeout(() => setHighlightedId(null), 2000);
        }
      },
    }));

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

    // Scroll infinite — load older messages
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleScroll = () => {
        if (container.scrollTop < 100 && !isLoadingMore && hasMoreRef.current && messages.length > 0) {
          const convId = messages[0]?.conversationId;
          if (!convId) return;

          setIsLoadingMore(true);
          const cursor = messages[0].id;
          const prevScrollHeight = container.scrollHeight;

          api
            .get<Message[]>(`/messages/conversation/${convId}?cursor=${cursor}`)
            .then((res) => {
              if (res.data.length === 0) {
                hasMoreRef.current = false;
              } else {
                useChatStore.getState().prependMessages(convId, res.data.reverse());
                requestAnimationFrame(() => {
                  container.scrollTop = container.scrollHeight - prevScrollHeight;
                });
              }
            })
            .catch(() => {})
            .finally(() => setIsLoadingMore(false));
        }
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, [messages, isLoadingMore]);

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
      const msg = contextMenu.message;
      fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002'}/messages/${msg.id}/pin`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }).then(() => {
        useChatStore.getState().updateMessage(msg.conversationId, msg.id, {
          isPinned: !msg.isPinned,
        });
        toast.success(msg.isPinned ? 'Message unpinned' : 'Message pinned');
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
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-muted-foreground">Loading older messages...</span>
            </div>
          )}
          <div className="space-y-0.5">
            {messages.map((msg, i) => {
              const isOwn = msg.sender.id === currentUserId;
              const prevMsg = messages[i - 1];
              const showAvatar =
                !isOwn && (!prevMsg || prevMsg.sender.id !== msg.sender.id);

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`transition-colors duration-700 rounded-lg ${
                    highlightedId === msg.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  />
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>

        {forwardingMessage && (
          <ForwardModal
            message={forwardingMessage}
            onClose={() => setForwardingMessage(null)}
          />
        )}

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
            onForward={() => { if (contextMenu) setForwardingMessage(contextMenu.message); }}
            onCopy={handleCopy}
          />
        )}
      </div>
    );
  },
);
