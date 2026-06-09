import { create } from 'zustand';
import type { Conversation } from '@/types/conversation';
import type { Message } from '@/types/message';

interface ChatState {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  activeConversationId: string | null;
  messages: Map<string, Message[]>;
  typingUsers: Map<string, string[]>;

  setConversations: (conversations: Conversation[]) => void;
  setArchivedConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean, lastSeenAt: string) => void;
  markMessageDelivered: (conversationId: string, messageId: string) => void;
  markConversationRead: (conversationId: string, senderId: string) => void;
  clearConversationUnread: (conversationId: string) => void;
  markConversationUnread: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  replyToMessage: Message | null;
  setReplyTo: (message: Message | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  archivedConversations: [],
  activeConversationId: null,
  messages: new Map(),
  typingUsers: new Map(),

  setConversations: (conversations) => set({ conversations }),

  setArchivedConversations: (archivedConversations) => set({ archivedConversations }),

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
      const existing = newMessages.get(conversationId) ?? [];
      // Merge: keep existing that aren't in new set, then add new
      const ids = new Set(messages.map((m) => m.id));
      const kept = existing.filter((m) => !ids.has(m.id));
      newMessages.set(conversationId, [...kept, ...messages]);
      return { messages: newMessages };
    }),

  prependMessages: (conversationId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(conversationId) ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const unique = messages.filter((m) => !existingIds.has(m.id));
      newMessages.set(conversationId, [...unique, ...existing]);
      return { messages: newMessages };
    }),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => {
      const mapper = (c: Conversation) =>
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
          : c;
      const byUpdatedAt = (a: Conversation, b: Conversation) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

      const conversations = state.conversations.map(mapper).sort(byUpdatedAt);
      const archivedConversations = state.archivedConversations
        .map(mapper)
        .sort(byUpdatedAt);
      return { conversations, archivedConversations };
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
    set((state) => {
      const mapper = (c: Conversation) =>
        c.otherUser.id === userId
          ? {
              ...c,
              otherUser: {
                ...c.otherUser,
                isOnline,
                lastSeenAt,
              },
            }
          : c;
      return {
        conversations: state.conversations.map(mapper),
        archivedConversations: state.archivedConversations.map(mapper),
      };
    }),

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

  clearConversationUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.isUnread ? { ...c, isUnread: false } : c,
      ),
      archivedConversations: state.archivedConversations.map((c) =>
        c.id === conversationId && c.isUnread ? { ...c, isUnread: false } : c,
      ),
    })),

  markConversationUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isUnread: true } : c,
      ),
      archivedConversations: state.archivedConversations.map((c) =>
        c.id === conversationId ? { ...c, isUnread: true } : c,
      ),
    })),

  archiveConversation: (conversationId) =>
    set((state) => {
      const target = state.conversations.find((c) => c.id === conversationId);
      const conversations = state.conversations.filter((c) => c.id !== conversationId);
      if (!target) return { conversations };
      const updated = { ...target, isArchived: true };
      const exists = state.archivedConversations.some((c) => c.id === conversationId);
      const archivedConversations = exists
        ? state.archivedConversations.map((c) =>
            c.id === conversationId ? updated : c,
          )
        : [updated, ...state.archivedConversations];
      return { conversations, archivedConversations };
    }),

  unarchiveConversation: (conversationId) =>
    set((state) => {
      const target = state.archivedConversations.find((c) => c.id === conversationId);
      const archivedConversations = state.archivedConversations.filter(
        (c) => c.id !== conversationId,
      );
      if (!target) return { archivedConversations };
      const updated = { ...target, isArchived: false };
      const exists = state.conversations.some((c) => c.id === conversationId);
      const conversations = exists
        ? state.conversations.map((c) => (c.id === conversationId ? updated : c))
        : [updated, ...state.conversations].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
      return { conversations, archivedConversations };
    }),
}));
