'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCall } from '@/hooks/use-call';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActiveCallScreen() {
  const {
    uiState,
    currentCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    toggleMute,
    toggleVideo,
  } = useCallStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { endCall, toggleScreenShare } = useCall();

  const [duration, setDuration] = useState(0);

  // Ref callbacks — run whenever the element mounts or the stream changes.
  // This is more reliable than useEffect with [stream] as dependency,
  // because it handles the case where the stream is already set but the
  // element mounts later (e.g. conditional rendering).
  const attachLocalStream = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && localStream && el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
    },
    [localStream],
  );

  const attachRemoteStream = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && remoteStream && el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
    },
    [remoteStream],
  );

  const attachRemoteAudio = useCallback(
    (el: HTMLAudioElement | null) => {
      if (el && remoteStream && el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
    },
    [remoteStream],
  );

  // Duration timer runs only when call is active
  useEffect(() => {
    if (uiState !== 'active') {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [uiState]);

  // Render if the UI state is outgoing OR active — do NOT require currentCall
  // because in outgoing state it might not have arrived yet from the backend.
  if (uiState !== 'active' && uiState !== 'outgoing') {
    return null;
  }

  const other = currentCall
    ? currentCall.callerId === currentUserId
      ? currentCall.callee
      : currentCall.caller
    : null;
  const initials = other?.displayName
    ? other.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '...';
  const isVideo = currentCall?.type === 'VIDEO' || (uiState === 'outgoing' && localStream?.getVideoTracks().length);
  const isOutgoing = uiState === 'outgoing';
  const isActive = uiState === 'active';
  const hasRemoteVideo = isVideo && remoteStream && isActive;
  const hasRemoteStream = remoteStream !== null;

  // Local video element position:
  // - Outgoing video call: fullscreen (so caller sees themselves)
  // - Active video call: PiP in top-right corner
  const localVideoPositionClass = isOutgoing
    ? 'absolute inset-0 w-full h-full object-cover bg-black scale-x-[-1]'
    : 'absolute top-6 right-6 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-2xl object-cover scale-x-[-1] z-10';

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Hidden audio element — always plays remote audio reliably */}
      <audio ref={attachRemoteAudio} autoPlay playsInline className="hidden" />

      {/* Main view */}
      <div className="relative flex-1 overflow-hidden">
        {/* Remote video fullscreen (only when active video call with stream) */}
        {hasRemoteVideo && (
          <video
            ref={attachRemoteStream}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover bg-black"
          />
        )}

        {/* Local video — single element, position controlled by CSS.
            Ref callback ensures srcObject is attached on mount. */}
        {isVideo && localStream && (
          <video
            ref={attachLocalStream}
            autoPlay
            playsInline
            muted
            className={localVideoPositionClass}
          />
        )}

        {/* Audio call active view (avatar centered) */}
        {!isVideo && !isOutgoing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-800 to-gray-900">
            <Avatar className="h-40 w-40 ring-4 ring-white/20">
              <AvatarImage src={other?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-white text-5xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold text-white">
              {other?.displayName ?? 'Call'}
            </h2>
            <p className="text-sm text-white/70 animate-pulse">
              {!hasRemoteStream ? 'Connecting...' : 'Voice call'}
            </p>
          </div>
        )}

        {/* Outgoing audio call: avatar centered with ping animation */}
        {!isVideo && isOutgoing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-800 to-gray-900">
            <div className="relative">
              <Avatar className="h-40 w-40 ring-4 ring-white/20">
                <AvatarImage src={other?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-white text-5xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full animate-ping ring-4 ring-white/30" />
              <span className="absolute -inset-2 rounded-full animate-ping ring-2 ring-white/20 [animation-delay:0.5s]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {other?.displayName ?? 'Calling...'}
            </h2>
            <p className="text-sm text-white/70 animate-pulse">
              {localStream ? 'Calling...' : 'Preparing call...'}
            </p>
          </div>
        )}

        {/* Outgoing video call: overlay callee info on top of local video */}
        {isVideo && isOutgoing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 z-20 pointer-events-none">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-white/30">
                <AvatarImage src={other?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-white text-4xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full animate-ping ring-4 ring-white/30" />
              <span className="absolute -inset-2 rounded-full animate-ping ring-2 ring-white/20 [animation-delay:0.5s]" />
            </div>
            <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
              {other?.displayName ?? 'Calling...'}
            </h2>
            <p className="text-sm text-white/90 animate-pulse drop-shadow-lg">
              {localStream ? 'Calling...' : 'Preparing call...'}
            </p>
          </div>
        )}

        {/* Header overlay — only shown when active (not outgoing) */}
        {isActive && other && (
          <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
                <AvatarImage src={other.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-white text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold text-sm">{other.displayName}</p>
                <p className="text-white/70 text-xs">{formatDuration(duration)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gradient-to-t from-black/90 to-transparent px-6 pt-12 pb-8 z-30">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            disabled={!localStream}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
              isMuted
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          {isVideo && (
            <button
              onClick={toggleVideo}
              disabled={!localStream}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                isVideoOff
                  ? 'bg-white text-gray-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isVideoOff ? 'Turn video on' : 'Turn video off'}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}

          {isVideo && isActive && (
            <button
              onClick={toggleScreenShare}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                isScreenSharing
                  ? 'bg-white text-gray-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
            </button>
          )}

          <div className="flex flex-col items-center gap-1 ml-2">
            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
              title={isOutgoing ? 'Cancel call' : 'End call'}
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </button>
            {isOutgoing && (
              <span className="text-xs text-white/80 font-medium">Cancel</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
