export interface Message {
  id: string;
  conversationId: string;
  content: string | null;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'GIF' | 'STICKER' | 'FILE';
  mediaUrl: string | null;
  isEdited: boolean;
  isPinned: boolean;
  deletedForAll: boolean;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo: {
    id: string;
    content: string | null;
    senderId: string;
    type: string;
  } | null;
  reactions?: {
    emoji: string;
    userId: string;
    username: string;
  }[];
}
