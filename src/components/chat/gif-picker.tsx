'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageIcon, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GifResult {
  id: string;
  title: string;
  images: {
    fixed_height_small: { url: string };
    original: { url: string };
  };
}

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

const GIPHY_API_KEY = process.env['NEXT_PUBLIC_GIPHY_API_KEY'] ?? '';

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!GIPHY_API_KEY) return;
    setIsLoading(true);

    const endpoint = searchQuery.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data ?? []);
    } catch {
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => fetchGifs(query), query ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [open, query, fetchGifs]);

  if (!GIPHY_API_KEY) return null;

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 shrink-0 text-muted-foreground hover:text-foreground px-2 gap-1 text-xs font-semibold"
        onClick={() => setOpen(!open)}
      >
        <ImageIcon className="h-4 w-4" />
        GIF
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search GIFs..."
                className="h-8 pl-8 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="h-60 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : gifs.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">No GIFs found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => { onGifSelect(gif.images.original.url); setOpen(false); setQuery(''); }}
                      className="overflow-hidden rounded-md hover:opacity-80 transition-opacity"
                    >
                      <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-auto" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
