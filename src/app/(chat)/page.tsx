'use client';

import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatPanel } from '@/components/chat/chat-panel';

export default function ChatPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - 360px on desktop, full width on mobile */}
      <div className="hidden w-[360px] shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Chat panel */}
      <ChatPanel />
    </div>
  );
}
