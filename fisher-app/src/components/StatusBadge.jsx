import { Badge } from '@/components/ui/badge'

const config = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  VERIFIED: { label: 'Approved', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  VALID: { label: 'Valid', variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
}

export default function StatusBadge({ status }) {
  const c = config[status] || { label: status, variant: 'outline' }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
