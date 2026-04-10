'use client';

import { Badge } from '@/components/ui/badge';
import type { ActivityStatus } from '@/types';

const statusVariant: Record<ActivityStatus, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
  'Complete': 'success',
  'In Progress': 'info',
  'Delayed': 'warning',
  'Blocked': 'danger',
  'Ready to Start': 'success',
  'Not Started': 'secondary',
};

export default function StatusBadge({ status }: { status: ActivityStatus }) {
  return <Badge variant={statusVariant[status] || 'secondary'}>{status}</Badge>;
}
