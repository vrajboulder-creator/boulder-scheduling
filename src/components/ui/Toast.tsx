'use client';

import { useAppStore } from '@/hooks/useAppStore';

export default function Toast() {
  const { toastMessage } = useAppStore();
  return (
    <div className={`toast${toastMessage ? ' show' : ''}`} id="toast">
      {toastMessage}
    </div>
  );
}
