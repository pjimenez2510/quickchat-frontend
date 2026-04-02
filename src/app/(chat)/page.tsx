'use client';

import { MessageCircle } from 'lucide-react';

export default function ChatEmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{ backgroundColor: 'var(--qc-bubble-sent)' }}
      >
        <MessageCircle className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold">QuickChat</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Select a conversation to start messaging
      </p>
    </div>
  );
}
