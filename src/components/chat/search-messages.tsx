'use client';

import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatMessageTime } from '@/lib/format';
import type { Message } from '@/types/message';

interface SearchMessagesProps {
  conversationId: string;
  onClose: () => void;
  onNavigate: (messageId: string) => void;
}

export function SearchMessages({ conversationId, onClose, onNavigate }: SearchMessagesProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      api
        .get<Message[]>(`/messages/conversation/${conversationId}/search?q=${encodeURIComponent(query)}`)
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, conversationId]);

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search in conversation..."
          className="h-8 text-sm border-none bg-transparent focus-visible:ring-0 px-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button onClick={onClose} className="shrink-0 rounded-full p-1 hover:bg-accent transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {query.trim() && (
        <div className="max-h-[200px] overflow-y-auto border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No results</p>
          ) : (
            results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => { onNavigate(msg.id); onClose(); }}
                className="flex w-full items-start gap-2 px-4 py-2 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{msg.sender.displayName}</span>
                    <span className="text-[11px] text-muted-foreground">{formatMessageTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.content}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
