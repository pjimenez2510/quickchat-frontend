'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketContext } from '@/components/providers/socket-provider';
import type { Call, CallType } from '@/types/call';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useCall() {
  const { socket } = useSocketContext();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const createPeerConnection = useCallback(
    (callId: string, targetUserId: string) => {
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

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('Peer connection state:', pc.connectionState);
        }
      };

      peerConnectionRef.current = pc;
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

      try {
        // Get media first
        const stream = await getLocalMedia(type);

        // Initiate call via socket
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
            useCallStore.getState().setUIState('outgoing');

            // Create peer connection
            const pc = createPeerConnection(call.id, call.calleeId);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // Create and send offer
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

      // Answer via socket — backend will notify caller to send offer
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
    useCallStore.getState().reset();
  }, [socket]);

  const endCall = useCallback(() => {
    const { currentCall, localStream } = useCallStore.getState();
    if (currentCall && socket) {
      socket.emit('call:end', { callId: currentCall.id });
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    useCallStore.getState().reset();
  }, [socket]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    const state = useCallStore.getState();
    const pc = peerConnectionRef.current;
    if (!pc || !state.localStream) return;

    if (state.isScreenSharing) {
      // Revert to camera
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          // Update local stream
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
          // When user stops sharing from browser UI
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }
        state.setScreenSharing(true);
      } catch {
        // User cancelled
      }
    }
  }, []);

  // Listen to incoming WebRTC signaling events
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ call }: { call: Call }) => {
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('incoming');
    };

    const handleAccepted = ({ call }: { call: Call }) => {
      useCallStore.getState().setCurrentCall(call);
      useCallStore.getState().setUIState('active');
      // Caller is already waiting; offer was already sent
    };

    const handleRejected = () => {
      const { localStream } = useCallStore.getState();
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      toast.info('Call rejected');
      useCallStore.getState().reset();
    };

    const handleEnded = () => {
      const { localStream } = useCallStore.getState();
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
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
      // This runs on the callee after accepting
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(callId, fromUserId);
        const { localStream } = useCallStore.getState();
        if (localStream) {
          localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream));
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush pending candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('call:answer-sdp', {
          callId,
          targetUserId: fromUserId,
          answer,
        });
      }
    };

    const handleAnswerSdp = async ({ answer }: { callId: string; answer: RTCSessionDescriptionInit }) => {
      // This runs on the caller after callee sends answer
      const pc = peerConnectionRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate', err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
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
  }, [socket, createPeerConnection]);

  return {
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleScreenShare,
    isCurrentUserCaller: (call: Call | null) => call?.callerId === currentUserId,
  };
}
