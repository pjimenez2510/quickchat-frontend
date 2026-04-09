'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Call, CallType } from '@/types/call';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Module-level singletons — shared across all useCall consumers
// There can only be one active call at a time, so this is safe.
let peerConnection: RTCPeerConnection | null = null;
const pendingCandidates: RTCIceCandidateInit[] = [];

function cleanupPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  pendingCandidates.length = 0;
}

function stopLocalStream() {
  const { localStream } = useCallStore.getState();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Call actions hook — safe to call from multiple components.
 * Returns functions to start/answer/reject/end calls.
 * Does NOT register socket listeners — those live in useCallSignaling.
 */
export function useCall() {
  const { socket } = useSocketContext();

  const createPeerConnection = useCallback(
    (callId: string, targetUserId: string) => {
      if (peerConnection) {
        peerConnection.close();
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call:ice-candidate', {
            callId,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        useCallStore.getState().setRemoteStream(remoteStream);
      };

      peerConnection = pc;
      return pc;
    },
    [socket],
  );

  const getLocalMedia = useCallback(async (type: CallType) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'VIDEO' ? { width: 1280, height: 720 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      useCallStore.getState().setLocalStream(stream);
      return stream;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied'
          : 'Could not access camera/microphone';
      toast.error(message);
      throw err;
    }
  }, []);

  const startCall = useCallback(
    async (conversationId: string, type: CallType) => {
      if (!socket) return;

      const store = useCallStore.getState();

      // Show outgoing UI immediately with a temporary placeholder
      store.setUIState('outgoing');

      try {
        const stream = await getLocalMedia(type);

        socket.emit(
          'call:initiate',
          { conversationId, type },
          async (response: { event: string; data: unknown }) => {
            if (response?.event !== 'call:initiated') {
              const errorData = response?.data as { message?: string } | undefined;
              toast.error(errorData?.message ?? 'Could not start call');
              stream.getTracks().forEach((t) => t.stop());
              useCallStore.getState().reset();
              return;
            }

            const call = response.data as Call;
            useCallStore.getState().setCurrentCall(call);

            // Create peer connection and send SDP offer
            const pc = createPeerConnection(call.id, call.calleeId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('call:offer', {
              callId: call.id,
              targetUserId: call.calleeId,
              offer,
            });
          },
        );
      } catch {
        useCallStore.getState().reset();
      }
    },
    [socket, getLocalMedia, createPeerConnection],
  );

  const answerCall = useCallback(async () => {
    const state = useCallStore.getState();
    const call = state.currentCall;
    if (!call || !socket) return;

    try {
      const stream = await getLocalMedia(call.type);

      // Create peer connection — we are the callee
      const pc = createPeerConnection(call.id, call.callerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Notify backend: callee accepted
      socket.emit('call:answer', { callId: call.id });
      state.setUIState('active');
    } catch {
      state.reset();
    }
  }, [socket, getLocalMedia, createPeerConnection]);

  const rejectCall = useCallback(() => {
    const { currentCall } = useCallStore.getState();
    if (!currentCall || !socket) return;
    socket.emit('call:reject', { callId: currentCall.id });
    stopLocalStream();
    cleanupPeerConnection();
    useCallStore.getState().reset();
  }, [socket]);

  const endCall = useCallback(() => {
    const { currentCall } = useCallStore.getState();
    if (currentCall && socket) {
      socket.emit('call:end', { callId: currentCall.id });
    }
    stopLocalStream();
    cleanupPeerConnection();
    useCallStore.getState().reset();
  }, [socket]);

  const toggleScreenShare = useCallback(async () => {
    const state = useCallStore.getState();
    const pc = peerConnection;
    if (!pc || !state.localStream) return;

    if (state.isScreenSharing) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          const oldVideoTrack = state.localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            state.localStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          state.localStream.addTrack(videoTrack);
        }
        state.setScreenSharing(false);
      } catch {
        toast.error('Could not switch to camera');
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
          const oldVideoTrack = state.localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            state.localStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          state.localStream.addTrack(screenTrack);
          screenTrack.onended = () => {
            void toggleScreenShare();
          };
        }
        state.setScreenSharing(true);
      } catch {
        // User cancelled
      }
    }
  }, []);

  const currentUserId = useAuthStore.getState().user?.id;

  return {
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleScreenShare,
    isCurrentUserCaller: (call: Call | null) => call?.callerId === currentUserId,
  };
}

/**
 * Call signaling hook — registers socket listeners for WebRTC events.
 * MUST ONLY be called once globally (in CallManager). Do not use in
 * regular components or you'll get duplicate events.
 */
export function useCallSignaling() {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ call }: { call: Call }) => {
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('incoming');
    };

    const handleAccepted = ({ call }: { call: Call }) => {
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('active');
    };

    const handleRejected = () => {
      stopLocalStream();
      cleanupPeerConnection();
      toast.info('Call rejected');
      useCallStore.getState().reset();
    };

    const handleEnded = () => {
      stopLocalStream();
      cleanupPeerConnection();
      toast.info('Call ended');
      useCallStore.getState().reset();
    };

    const handleOffer = async ({
      callId,
      fromUserId,
      offer,
    }: {
      callId: string;
      fromUserId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      let pc = peerConnection;
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call:ice-candidate', {
              callId,
              targetUserId: fromUserId,
              candidate: event.candidate.toJSON(),
            });
          }
        };
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          useCallStore.getState().setRemoteStream(remoteStream);
        };
        peerConnection = pc;

        const { localStream } = useCallStore.getState();
        if (localStream) {
          localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream));
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.length = 0;

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer-sdp', {
        callId,
        targetUserId: fromUserId,
        answer,
      });
    };

    const handleAnswerSdp = async ({ answer }: { callId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnection;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.length = 0;
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnection;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate', err);
        }
      } else {
        pendingCandidates.push(candidate);
      }
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer-sdp', handleAnswerSdp);
    socket.on('call:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer-sdp', handleAnswerSdp);
      socket.off('call:ice-candidate', handleIceCandidate);
    };
  }, [socket]);
}
