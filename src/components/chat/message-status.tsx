'use client';

import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'read';
}

export function MessageStatus({ status }: MessageStatusProps) {
  if (status === 'read') {
    return (
      <CheckCheck
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: 'var(--qc-read)' }}
      />
    );
  }

  if (status === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }

  return <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}
