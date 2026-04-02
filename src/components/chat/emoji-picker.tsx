'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const QUICK_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😎', '🤩', '😇', '🥳',
  '😤', '😭', '🤯', '😱', '🫠', '🤔', '😴', '🤗',
  '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🔥', '⭐', '✨', '💯', '🎉', '🎊', '💕', '💖',
  '👋', '🫶', '🤙', '👊', '😘', '😜', '🙄', '😏',
];

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
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
        <Smile className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-[280px] rounded-xl border border-border bg-background p-3 shadow-lg">
          <div className="grid grid-cols-8 gap-0.5">
            {QUICK_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => {
                  onEmojiSelect(emoji);
                  setOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xl hover:bg-accent transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
