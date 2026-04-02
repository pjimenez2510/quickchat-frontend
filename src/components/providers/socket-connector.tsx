'use client';

import { useEffect } from 'react';
import { useSocketContext } from './socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { Message } from '@/types/message';

export function SocketConnector({ children }: { children: React.ReactNode }) {
  const { socket, isConnected, connect, disconnect } = useSocketContext();
  const user = useAuthStore((s) => s.user);

  // Connect socket as soon as user is authenticated
  useEffect(() => {
    if (!isConnected && user) {
      const token = localStorage.getItem('accessToken');
      if (token) connect(token);
    }

    return () => {
      disconnect();
    };
  }, [user, isConnected, connect, disconnect]);

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

    const handleNewMessage = (data: {
      conversationId: string;
      message: Message;
    }) => {
      useChatStore.getState().addMessage(data.conversationId, data.message);
      useChatStore
        .getState()
        .updateConversationLastMessage(data.conversationId, data.message);
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
