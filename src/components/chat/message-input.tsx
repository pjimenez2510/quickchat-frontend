'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from './emoji-picker';
import { GifPicker } from './gif-picker';
import { StickerPicker } from './sticker-picker';
import { VoiceRecorder } from './voice-recorder';
import { useUpload } from '@/hooks/use-upload';

interface MessageInputProps {
  onSend: (content: string, type?: string, mediaUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 2000);
  }, [onTypingStart, onTypingStop]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) { isTypingRef.current = false; onTypingStop(); }
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleTyping();
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    onSend(gifUrl, 'GIF', gifUrl);
  };

  const handleStickerSelect = (sticker: string) => {
    onSend(sticker, 'STICKER');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const result = await uploadFile(file);
      if (result) {
        onSend(file.name, result.messageType, result.fileUrl);
        toast.success('File sent');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleVoiceReady = async (blob: Blob) => {
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const result = await uploadFile(file, 'voices');
      if (result) {
        onSend('Voice message', 'VOICE', result.fileUrl);
        toast.success('Voice message sent');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 mb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
        />
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <GifPicker onGifSelect={handleGifSelect} />
        <StickerPicker onStickerSelect={handleStickerSelect} />
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isUploading}
            rows={1}
            className="w-full resize-none rounded-2xl border border-border bg-accent/30 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
        </div>

        {content.trim() ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isUploading}
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <VoiceRecorder onVoiceReady={handleVoiceReady} isUploading={isUploading} />
        )}
      </div>
    </div>
  );
}
