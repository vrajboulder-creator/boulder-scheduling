'use client';

import type { Activity } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import { fmt, isOverdue, getTradeColor } from '@/lib/helpers';
import StatusBadge from './StatusBadge';
import PctBar from './PctBar';

interface ActivityTableProps {
  items: Activity[];
}

export default function ActivityTable({ items }: ActivityTableProps) {
  const { setSelectedActivity } = useAppStore();

  if (!items.length) {
    return (
      <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>No activities match your filters.</p>
      </div>
    );
  }

  return (
    <div className="schedule-table-wrap">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Activity</th>
            <th>Trade</th>
            <th className="col-hide-mobile">Area</th>
            <th>Start</th>
            <th>Finish</th>
            <th className="col-hide-mobile">Duration</th>
            <th>Status</th>
            <th>Progress</th>
            <th className="col-hide-mobile">Priority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr
              key={a.id}
              data-id={a.id}
              className={isOverdue(a) ? 'overdue' : ''}
              onClick={() => setSelectedActivity(a.id)}
            >
              <td className="activity-id">{a.id}</td>
              <td className="activity-name">
                {a.milestone && '◆ '}
                {a.name}
                {a.blocker && <span className="blocker-tag" style={{ marginLeft: 6 }}>{a.blocker}</span>}
              </td>
              <td>
                <span
                  className="trade-badge"
                  style={{ borderLeftColor: getTradeColor(a.trade) }}
                >
                  {a.trade}
                </span>
              </td>
              <td className="col-hide-mobile">{a.area}</td>
              <td>{fmt(a.start)}</td>
              <td>{fmt(a.finish)}</td>
              <td className="col-hide-mobile">{a.duration}d</td>
              <td><StatusBadge status={a.status} /></td>
              <td><PctBar pct={a.pct} /></td>
              <td className="col-hide-mobile">
                <span className={`priority-dot ${a.priority.toLowerCase()}`} />
                {a.priority}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
