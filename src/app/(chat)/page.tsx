'use client';

import { MessageCircle, Lock, Zap } from 'lucide-react';

export default function ChatEmptyPage() {
  // En móvil el sidebar ocupa toda la pantalla en la raíz, así que esta vista
  // no debe renderizarse (de lo contrario aparecería pegada arriba sin centrar).
  return (
    <div className="hidden md:flex h-full w-full flex-1 items-center justify-center bg-background px-8">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl mb-5 bg-[var(--qc-bubble-sent)] shadow-md">
          <MessageCircle className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">QuickChat</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Select a conversation from the sidebar to start messaging, or search
          for someone to start a new chat.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Encrypted in transit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Real-time
          </span>
        </div>
      </div>
    </div>
  );
}
