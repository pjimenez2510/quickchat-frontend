export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ANSWERED' | 'REJECTED' | 'MISSED' | 'ENDED';

export interface Call {
  id: string;
  callerId: string;
  calleeId: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  caller: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  callee: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}
