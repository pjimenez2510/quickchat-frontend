'use client';

import { useCall } from '@/hooks/use-call';
import { IncomingCallModal } from './incoming-call-modal';
import { ActiveCallScreen } from './active-call-screen';

export function CallManager() {
  // Activates all WebRTC listeners globally
  useCall();

  return (
    <>
      <IncomingCallModal />
      <ActiveCallScreen />
    </>
  );
}
