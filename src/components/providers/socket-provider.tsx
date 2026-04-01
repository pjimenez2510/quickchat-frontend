'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { type Socket } from 'socket.io-client';
import { useSocket } from '@/hooks/use-socket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export function useSocketContext() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketState = useSocket();

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
}
