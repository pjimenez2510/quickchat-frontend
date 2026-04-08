'use client';

import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCall } from '@/hooks/use-call';

export function IncomingCallModal() {
  const { uiState, currentCall } = useCallStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { answerCall, rejectCall } = useCall();

  // Play ringtone
  useEffect(() => {
    if (uiState !== 'incoming') return;

    // Simple beep loop using Web Audio API
    let audioContext: AudioContext | null = null;
    let interval: NodeJS.Timeout | null = null;

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();

      const beep = () => {
        if (!audioContext) return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      };

      beep();
      interval = setInterval(beep, 1500);
    } catch {
      // Ignore audio errors
    }

    return () => {
      if (interval) clearInterval(interval);
      if (audioContext) audioContext.close();
    };
  }, [uiState]);

  if (uiState !== 'incoming' || !currentCall) return null;

  // The "other" user is the caller (since we're the callee)
  const other = currentCall.callerId === currentUserId ? currentCall.callee : currentCall.caller;
  const initials = other.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-background border border-border p-8 mx-4 shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-primary/30">
              <AvatarImage src={other.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background"
              style={{ backgroundColor: 'var(--qc-bubble-sent)' }}
            >
              {currentCall.type === 'VIDEO' ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <Phone className="h-5 w-5 text-white" />
              )}
            </span>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold">{other.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1 animate-pulse">
              Incoming {currentCall.type === 'VIDEO' ? 'video call' : 'voice call'}...
            </p>
          </div>

          <div className="flex items-center gap-8 mt-4">
            <button
              onClick={rejectCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            <button
              onClick={answerCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-lg"
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
          </div>

          <div className="flex gap-16 text-xs text-muted-foreground">
            <span>Decline</span>
            <span>Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
