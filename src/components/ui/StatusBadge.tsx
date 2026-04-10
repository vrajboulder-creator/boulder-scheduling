'use client';

import type { ActivityStatus } from '@/types';

const statusClasses: Record<ActivityStatus, string> = {
  'In Progress': 'in-progress',
  'Complete': 'complete',
  'Delayed': 'delayed',
  'Blocked': 'blocked',
  'Ready to Start': 'ready',
  'Not Started': 'not-started',
};

export default function StatusBadge({ status }: { status: ActivityStatus }) {
  return <span className={`status ${statusClasses[status] || 'not-started'}`}>{status}</span>;
}
