'use client';

import { useState, useRef, useEffect } from 'react';
import { Sticker } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STICKER_PACKS = {
  Emotions: ['😀', '😂', '🥰', '😎', '🤩', '😇', '🥳', '😤', '😭', '🤯', '😱', '🫠'],
  Hands: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '👋', '🫶', '🤙', '👊'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💘', '💝'],
  Animals: ['🐶', '🐱', '🐻', '🦊', '🐼', '🐨', '🦁', '🐸', '🐵', '🦄', '🐝', '🦋'],
  Food: ['🍕', '🍔', '🌮', '🍣', '🍩', '🍦', '🎂', '🍪', '☕', '🧋', '🍺', '🥂'],
  Activities: ['⚽', '🏀', '🎮', '🎵', '🎬', '📸', '✈️', '🚀', '🎉', '🎊', '🏆', '🎯'],
};

type PackName = keyof typeof STICKER_PACKS;

interface StickerPickerProps {
  onStickerSelect: (sticker: string) => void;
}

export function StickerPicker({ onStickerSelect }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [activePack, setActivePack] = useState<PackName>('Emotions');
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

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        <Sticker className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {(Object.keys(STICKER_PACKS) as PackName[]).map((pack) => (
              <button
                key={pack}
                onClick={() => setActivePack(pack)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activePack === pack
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {pack}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {STICKER_PACKS[activePack].map((sticker, i) => (
              <button
                key={`${activePack}-${i}`}
                onClick={() => { onStickerSelect(sticker); setOpen(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-accent transition-colors"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
