'use client';

import { useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Message } from '@/types/message';

export function ChatPanel() {
  const user = useAuthStore((s) => s.user);
  const {
    activeConversationId,
    conversations,
    messages: messagesMap,
    typingUsers,
    setMessages,
  } = useChatStore();

  const { socket, isConnected } = useSocketContext();

  const conversation = conversations.find(
    (c) => c.id === activeConversationId,
  );
  const currentMessages = activeConversationId
    ? messagesMap.get(activeConversationId) ?? []
    : [];
  const typingInConversation = activeConversationId
    ? (typingUsers.get(activeConversationId) ?? []).filter(
        (uid) => uid !== user?.id,
      )
    : [];

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    const cached = messagesMap.get(activeConversationId);
    if (cached && cached.length > 0) return;

    api
      .get<Message[]>(`/messages/conversation/${activeConversationId}`)
      .then((res) => {
        setMessages(activeConversationId, res.data.reverse());
      })
      .catch(() => {});
  }, [activeConversationId, messagesMap, setMessages]);

  const handleSend = useCallback(
    (content: string) => {
      if (!socket || !activeConversationId) return;

      socket.emit('message:send', {
        conversationId: activeConversationId,
        content,
        type: 'TEXT',
      });
    },
    [socket, activeConversationId],
  );

  const handleTypingStart = useCallback(() => {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:start', { conversationId: activeConversationId });
  }, [socket, activeConversationId]);

  const handleTypingStop = useCallback(() => {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:stop', { conversationId: activeConversationId });
  }, [socket, activeConversationId]);

  // Empty state
  if (!activeConversationId || !conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
          style={{ backgroundColor: 'var(--qc-bubble-sent)' }}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold">QuickChat</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a conversation to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      <ChatHeader
        displayName={conversation.otherUser.displayName}
        username={conversation.otherUser.username}
        avatarUrl={conversation.otherUser.avatarUrl}
        isOnline={conversation.otherUser.isOnline}
        lastSeenAt={conversation.otherUser.lastSeenAt}
        isTyping={typingInConversation.length > 0}
      />

      <MessageList messages={currentMessages} currentUserId={user?.id ?? ''} />

      <MessageInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!isConnected}
      />
    </div>
  );
}
