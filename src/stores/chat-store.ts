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
}));
