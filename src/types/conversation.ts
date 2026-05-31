export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: string | null;
    customStatus: string | null;
    customStatusEmoji: string | null;
  };
  lastMessage: {
    id: string;
    content: string | null;
    type: string;
    senderId: string;
    createdAt: string;
  } | null;
  isArchived: boolean;
  isUnread: boolean;
  updatedAt: string;
}
