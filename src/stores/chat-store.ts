import { create } from 'zustand';
import type { Conversation } from '@/types/conversation';
import type { Message } from '@/types/message';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Map<string, Message[]>;
  typingUsers: Map<string, string[]>;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean, lastSeenAt: string) => void;
  markMessageDelivered: (conversationId: string, messageId: string) => void;
  markConversationRead: (conversationId: string, senderId: string) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  replyToMessage: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: new Map(),
  typingUsers: new Map(),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(conversationId) ?? [];
      if (existing.some((m) => m.id === message.id)) return state;
      newMessages.set(conversationId, [...existing, message]);
      return { messages: newMessages };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(conversationId, messages);
      return { messages: newMessages };
    }),

  prependMessages: (conversationId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(conversationId) ?? [];
      newMessages.set(conversationId, [...messages, ...existing]);
      return { messages: newMessages };
    }),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                id: message.id,
                content: message.content,
                type: message.type,
                senderId: message.sender.id,
                createdAt: message.createdAt,
              },
              updatedAt: message.createdAt,
            }
          : c,
      );
      updated.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return { conversations: updated };
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const newTyping = new Map(state.typingUsers);
      const users = newTyping.get(conversationId) ?? [];
      if (isTyping && !users.includes(userId)) {
        newTyping.set(conversationId, [...users, userId]);
      } else if (!isTyping) {
        newTyping.set(
          conversationId,
          users.filter((u) => u !== userId),
        );
      }
      return { typingUsers: newTyping };
    }),

  updateUserOnlineStatus: (userId, isOnline, lastSeenAt) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.otherUser.id === userId
          ? {
              ...c,
              otherUser: {
                ...c.otherUser,
                isOnline,
                lastSeenAt,
              },
            }
          : c,
      ),
    })),

  markMessageDelivered: (conversationId, messageId) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const msgs = newMessages.get(conversationId);
      if (msgs) {
        newMessages.set(
          conversationId,
          msgs.map((m) =>
            m.id === messageId && m.status === 'sent'
              ? { ...m, status: 'delivered' as const }
              : m,
          ),
        );
      }
      return { messages: newMessages };
    }),

  replyToMessage: null,

  setReplyTo: (message) => set({ replyToMessage: message }),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const msgs = newMessages.get(conversationId);
      if (msgs) {
        newMessages.set(
          conversationId,
          msgs.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        );
      }
      return { messages: newMessages };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const msgs = newMessages.get(conversationId);
      if (msgs) {
        newMessages.set(
          conversationId,
          msgs.filter((m) => m.id !== messageId),
        );
      }
      return { messages: newMessages };
    }),

  markConversationRead: (conversationId, senderId) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const msgs = newMessages.get(conversationId);
      if (msgs) {
        newMessages.set(
          conversationId,
          msgs.map((m) =>
            m.sender.id === senderId && m.status !== 'read'
              ? { ...m, status: 'read' as const }
              : m,
          ),
        );
      }
      return { messages: newMessages };
    }),
}));
