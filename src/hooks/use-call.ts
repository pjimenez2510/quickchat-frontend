'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Call, CallType } from '@/types/call';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Module-level singletons — there is only one active call at a time.
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

function createPc(
  socket: Socket,
  callId: string,
  targetUserId: string,
): RTCPeerConnection {
  if (peerConnection) {
    peerConnection.close();
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
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
}

async function getUserMedia(type: CallType): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: true,
    video: type === 'VIDEO' ? { width: 1280, height: 720 } : false,
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  useCallStore.getState().setLocalStream(stream);
  return stream;
}

/**
 * Call actions hook — safe to call from multiple components.
 * Does NOT register socket listeners — those live in useCallSignaling.
 */
export function useCall() {
  const { socket } = useSocketContext();

  const startCall = useCallback(
    async (conversationId: string, type: CallType) => {
      if (!socket) return;

      // Show outgoing UI immediately
      useCallStore.getState().setUIState('outgoing');

      try {
        await getUserMedia(type);

        socket.emit(
          'call:initiate',
          { conversationId, type },
          (response: { event: string; data: unknown }) => {
            if (response?.event !== 'call:initiated') {
              const errorData = response?.data as { message?: string } | undefined;
              toast.error(errorData?.message ?? 'Could not start call');
              stopLocalStream();
              useCallStore.getState().reset();
              return;
            }

            const call = response.data as Call;
            useCallStore.getState().setCurrentCall(call);
            // Do NOT create peer connection or send offer yet.
            // Wait for 'call:accepted' event, handled in useCallSignaling.
          },
        );
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera/microphone access denied'
            : 'Could not access camera/microphone';
        toast.error(message);
        useCallStore.getState().reset();
      }
    },
    [socket],
  );

  const answerCall = useCallback(async () => {
    const state = useCallStore.getState();
    const call = state.currentCall;
    if (!call || !socket) return;

    try {
      const stream = await getUserMedia(call.type);

      // Create peer connection as callee, add local tracks
      const pc = createPc(socket, call.id, call.callerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Notify backend: callee accepted
      socket.emit('call:answer', { callId: call.id });
      state.setUIState('active');
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied'
          : 'Could not access camera/microphone';
      toast.error(message);
      state.reset();
    }
  }, [socket]);

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
 * Call signaling hook — registers WebRTC socket listeners ONCE globally.
 * Only CallManager should call this.
 */
export function useCallSignaling() {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ call }: { call: Call }) => {
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('incoming');
    };

    const handleAccepted = async ({ call }: { call: Call }) => {
      // This runs on the CALLER after the CALLEE accepted.
      // Now it's safe to create the peer connection, add local tracks,
      // create an offer, and send it — we know the callee has a PC ready.
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('active');

      const { localStream } = useCallStore.getState();
      if (!localStream) {
        console.error('No local stream available for caller');
        return;
      }

      const pc = createPc(socket, call.id, call.calleeId);
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', {
          callId: call.id,
          targetUserId: call.calleeId,
          offer,
        });
      } catch (err) {
        console.error('Failed to create offer', err);
      }
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
      // This runs on the CALLEE. The PC was already created in answerCall().
      const pc = peerConnection;
      if (!pc) {
        console.error('handleOffer: no peer connection on callee side');
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush any ICE candidates that arrived before the remote description
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
      } catch (err) {
        console.error('handleOffer error', err);
      }
    };

    const handleAnswerSdp = async ({
      answer,
    }: {
      callId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      // This runs on the CALLER after the CALLEE sent its answer.
      const pc = peerConnection;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.length = 0;
      } catch (err) {
        console.error('handleAnswerSdp error', err);
      }
    };

    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
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
