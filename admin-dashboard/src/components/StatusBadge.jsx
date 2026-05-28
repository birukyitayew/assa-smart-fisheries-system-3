import { Badge } from '@/components/ui/badge';

const variants = {
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
  VALID: 'default',
  EXPIRED: 'destructive',
  SUSPENDED: 'destructive',
};

const labels = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  VALID: 'Valid',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
};

export default function StatusBadge({ status, className }) {
  return (
    <Badge variant={variants[status] || 'outline'} className={className}>
      {labels[status] || status}
    </Badge>
  );
}
