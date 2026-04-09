'use client';

import { useCallSignaling } from '@/hooks/use-call';
import { IncomingCallModal } from './incoming-call-modal';
import { ActiveCallScreen } from './active-call-screen';

export function CallManager() {
  // Registers all WebRTC socket listeners ONCE globally
  useCallSignaling();

  return (
    <>
      <IncomingCallModal />
      <ActiveCallScreen />
    </>
  );
}
