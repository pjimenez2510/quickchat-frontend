'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from './socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { api } from '@/lib/api';
import type { Message } from '@/types/message';
import type { Conversation } from '@/types/conversation';

export function SocketConnector({ children }: { children: React.ReactNode }) {
  const { socket, connect, disconnect } = useSocketContext();
  const user = useAuthStore((s) => s.user);
  const hasConnected = useRef(false);

  // Connect socket once when user is available
  useEffect(() => {
    if (hasConnected.current || !user) return;

    const token = localStorage.getItem('accessToken');
    if (token) {
      connect(token);
      hasConnected.current = true;
    }

    return () => {
      if (hasConnected.current) {
        disconnect();
        hasConnected.current = false;
      }
    };
  }, [user, connect, disconnect]);

  // Global socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: {
      userId: string;
      isOnline: boolean;
      lastSeenAt: string;
    }) => {
      useChatStore
        .getState()
        .updateUserOnlineStatus(data.userId, data.isOnline, data.lastSeenAt);
    };

    const handleNewMessage = async (data: {
      conversationId: string;
      message: Message;
    }) => {
      const store = useChatStore.getState();
      store.addMessage(data.conversationId, data.message);

      // Check if conversation exists in store
      const exists = store.conversations.find(
        (c) => c.id === data.conversationId,
      );

      if (exists) {
        store.updateConversationLastMessage(data.conversationId, data.message);
      } else {
        // New conversation — fetch it from API and add to store
        try {
          const res = await api.get<Conversation>(
            `/conversations/${data.conversationId}`,
          );
          useChatStore.setState((state) => ({
            conversations: [res.data, ...state.conversations],
          }));
        } catch {
          // Silently fail — conversation will appear on next reload
        }
      }
    };

    const handleTyping = (data: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      useChatStore
        .getState()
        .setTyping(data.conversationId, data.userId, data.isTyping);
    };

    socket.on('user:online', handleUserOnline);
    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleTyping);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleTyping);
    };
  }, [socket]);

  return <>{children}</>;
}
