import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  critical: {
    className: 'sidebar-dot-critical',
    tooltip: 'Critical alert',
  },
  active: {
    className: 'sidebar-dot-active',
    tooltip: 'New activity',
  },
  unread: {
    className: 'sidebar-dot-unread',
    tooltip: 'Unread updates',
  },
};

export default function SidebarNotification({ status }) {
  if (!status || status === 'none') return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={cn('sidebar-dot', config.className)}
      title={config.tooltip}
      aria-label={config.tooltip}
    />
  );
}
