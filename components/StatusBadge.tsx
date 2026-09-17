import type { AdaptiveAction, WeaknessStatus } from '../lib/types';
import { actionLabel, statusLabel } from '../lib/ui/labels';

export function StatusBadge({
  status,
  action,
  className = '',
}: {
  status?: WeaknessStatus | null;
  action?: AdaptiveAction;
  className?: string;
}) {
  const value = action ? actionLabel(action) : statusLabel(status ?? null);
  const key = action ?? status ?? 'neutral';
  return <span className={`status-badge tone-${key} ${className}`}>{value}<i /></span>;
}
