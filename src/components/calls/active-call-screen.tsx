'use client';

import { useEffect, useRef, useState } from 'react';
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, uiState]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Always attach remote stream to a dedicated audio element for reliable audio playback
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer (only when call is active, not outgoing)
  useEffect(() => {
    if (uiState !== 'active') {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [uiState]);

  if ((uiState !== 'active' && uiState !== 'outgoing') || !currentCall) {
    return null;
  }

  const other = currentCall.callerId === currentUserId ? currentCall.callee : currentCall.caller;
  const initials = other.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const isVideo = currentCall.type === 'VIDEO';
  const isOutgoing = uiState === 'outgoing';
  const isActive = uiState === 'active';
  const hasRemoteVideo = isVideo && remoteStream && isActive;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Hidden audio element — always plays remote stream audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main view */}
      <div className="relative flex-1 overflow-hidden">
        {hasRemoteVideo ? (
          // Active video call — remote video fullscreen, local video muted
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover bg-black"
          />
        ) : isVideo && isOutgoing && localStream ? (
          // Outgoing video call — show local video fullscreen while calling
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover bg-black scale-x-[-1]"
          />
        ) : (
          // Audio call or waiting — show avatar
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-800 to-gray-900">
            <div className="relative">
              <Avatar className="h-40 w-40 ring-4 ring-white/20">
                <AvatarImage src={other.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-white text-5xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOutgoing && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping ring-4 ring-white/30" />
                  <span className="absolute -inset-2 rounded-full animate-ping ring-2 ring-white/20 [animation-delay:0.5s]" />
                </>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-white">{other.displayName}</h2>
            <p className="text-sm text-white/70 animate-pulse">
              {isOutgoing
                ? isVideo
                  ? 'Calling...'
                  : 'Calling...'
                : 'Connecting...'}
            </p>
          </div>
        )}

        {/* Header overlay with name + timer */}
        <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-white/30">
              <AvatarImage src={other.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{other.displayName}</p>
              <p className="text-white/70 text-xs">
                {isOutgoing ? 'Calling...' : formatDuration(duration)}
              </p>
            </div>
          </div>
        </div>

        {/* Local video PiP — only when remote video is showing (active video call) */}
        {hasRemoteVideo && localStream && (
          <div className="absolute top-6 right-6 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-2xl">
            <video
              autoPlay
              playsInline
              muted
              ref={(el) => {
                if (el && localStream) el.srcObject = localStream;
              }}
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoOff className="h-8 w-8 text-white/50" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gradient-to-t from-black/80 to-transparent px-6 py-8">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
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
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
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

          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg ml-2"
            title="End call"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
