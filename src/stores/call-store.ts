import { create } from 'zustand';
import type { Call } from '@/types/call';

type CallUIState = 'idle' | 'outgoing' | 'incoming' | 'active';

interface CallState {
  uiState: CallUIState;
  currentCall: Call | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;

  setUIState: (state: CallUIState) => void;
  setCurrentCall: (call: Call | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setScreenSharing: (sharing: boolean) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  uiState: 'idle',
  currentCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,

  setUIState: (uiState) => set({ uiState }),
  setCurrentCall: (currentCall) => set({ currentCall }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),

  toggleMute: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = state.isMuted;
        });
      }
      return { isMuted: !state.isMuted };
    }),

  toggleVideo: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((track) => {
          track.enabled = state.isVideoOff;
        });
      }
      return { isVideoOff: !state.isVideoOff };
    }),

  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

  reset: () =>
    set({
      uiState: 'idle',
      currentCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    }),
}));
