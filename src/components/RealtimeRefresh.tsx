'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/hooks/useRealtime';

interface RealtimeRefreshProps {
  table: string;
  filter?: string;
  children?: React.ReactNode;
}

export default function RealtimeRefresh({
  table,
  filter,
  children,
}: RealtimeRefreshProps) {
  const router = useRouter();

  useRealtime({
    table,
    event: '*',
    filter,
    onChange: useCallback(() => {
      router.refresh();
    }, [router]),
  });

  return <>{children}</>;
}
