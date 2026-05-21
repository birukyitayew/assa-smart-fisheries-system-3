import { cn } from '@/lib/utils'

export const statusVariants = {
  success: 'text-success bg-success-muted',
  warning: 'text-warning bg-warning-muted',
  danger: 'text-destructive bg-destructive/10',
  info: 'text-info bg-info-muted',
  muted: 'text-muted-foreground bg-muted',
  primary: 'text-primary bg-primary/10',
}

export function statusClass(variant = 'muted', extra) {
  return cn(statusVariants[variant] ?? statusVariants.muted, extra)
}
