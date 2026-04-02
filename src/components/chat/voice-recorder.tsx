'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onVoiceReady: (blob: Blob) => void;
  isUploading: boolean;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

export function VoiceRecorder({ onVoiceReady, isUploading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser does not support audio recording');
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      toast.error('No supported audio format found in your browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        onVoiceReady(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow it in your browser settings.'
          : 'Failed to start recording';
      toast.error(message);
    }
  }, [onVoiceReady]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--qc-error)' }}>
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--qc-error)' }} />
          {formatDuration(duration)}
        </span>
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors"
          style={{ backgroundColor: 'var(--qc-error)' }}
        >
          <Square className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
