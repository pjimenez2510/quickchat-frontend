'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { ChatHeader } from './chat-header';
import { MessageList, type MessageListHandle } from './message-list';
import { MessageInput } from './message-input';
import { ReplyBar } from './reply-bar';
import { PinnedMessagesPanel } from './pinned-messages-panel';
import { SearchMessages } from './search-messages';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Message } from '@/types/message';
import type { Conversation } from '@/types/conversation';

export function ChatPanel() {
  const user = useAuthStore((s) => s.user);
  const {
    activeConversationId,
    conversations,
    messages: messagesMap,
    typingUsers,
    setMessages,
    setConversations,
    replyToMessage,
    setReplyTo,
  } = useChatStore();

  const { socket, isConnected } = useSocketContext();

  let conversation = conversations.find(
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

  // Load conversation if not in store (e.g., direct URL access after reload)
  useEffect(() => {
    if (!activeConversationId) return;

    const exists = useChatStore.getState().conversations.find(
      (c) => c.id === activeConversationId,
    );
    if (exists) return;

    api
      .get<Conversation>(`/conversations/${activeConversationId}`)
      .then((res) => {
        useChatStore.setState((state) => {
          const alreadyExists = state.conversations.find((c) => c.id === res.data.id);
          if (alreadyExists) return state;
          return { conversations: [res.data, ...state.conversations] };
        });
      })
      .catch(() => {});
  }, [activeConversationId]);

  // Emit read receipt when opening a conversation
  useEffect(() => {
    if (!activeConversationId || !socket) return;
    socket.emit('message:read', { conversationId: activeConversationId });
  }, [activeConversationId, socket]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    const cached = useChatStore.getState().messages.get(activeConversationId);
    if (cached && cached.length > 0) return;

    api
      .get<Message[]>(`/messages/conversation/${activeConversationId}`)
      .then((res) => {
        useChatStore.getState().setMessages(activeConversationId, res.data.reverse());
      })
      .catch(() => {});
  }, [activeConversationId]);

  const handleSend = useCallback(
    (content: string, type?: string, mediaUrl?: string) => {
      if (!socket || !activeConversationId) return;

      socket.emit('message:send', {
        conversationId: activeConversationId,
        content,
        type: type ?? 'TEXT',
        mediaUrl,
        replyToId: replyToMessage?.id,
      });

      setReplyTo(null);
    },
    [socket, activeConversationId, replyToMessage, setReplyTo],
  );

  const handleTypingStart = useCallback(() => {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:start', { conversationId: activeConversationId });
  }, [socket, activeConversationId]);

  const handleTypingStop = useCallback(() => {
    if (!socket || !activeConversationId) return;
    socket.emit('typing:stop', { conversationId: activeConversationId });
  }, [socket, activeConversationId]);

  const [showPinned, setShowPinned] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const messageListRef = useRef<MessageListHandle>(null);

  // Re-read conversation after it might have been added
  conversation = conversations.find((c) => c.id === activeConversationId);

  if (!activeConversationId || !conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading conversation...</p>
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
        conversationId={conversation.id}
        onTogglePinned={() => { setShowPinned(!showPinned); setShowSearch(false); }}
        showPinned={showPinned}
        onToggleSearch={() => { setShowSearch(!showSearch); setShowPinned(false); }}
        showSearch={showSearch}
      />

      {showSearch && activeConversationId && (
        <SearchMessages
          conversationId={activeConversationId}
          onClose={() => setShowSearch(false)}
          onNavigate={(id) => messageListRef.current?.scrollToMessage(id)}
        />
      )}

      {showPinned && activeConversationId && (
        <PinnedMessagesPanel
          conversationId={activeConversationId}
          onClose={() => setShowPinned(false)}
          onNavigate={(messageId) => messageListRef.current?.scrollToMessage(messageId)}
        />
      )}

      <MessageList ref={messageListRef} messages={currentMessages} currentUserId={user?.id ?? ''} />

      {replyToMessage && (
        <ReplyBar message={replyToMessage} onCancel={() => setReplyTo(null)} />
      )}

      <MessageInput
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!isConnected}
      />
    </div>
  );
}
