'use client';

import { use, useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { ChatPanel } from '@/components/chat/chat-panel';

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  return <ChatPanel />;
}
