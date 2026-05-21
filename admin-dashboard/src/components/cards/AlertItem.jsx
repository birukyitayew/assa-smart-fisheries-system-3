import { cn } from '@/lib/utils'

function alertColor(severity) {
  if (severity === 'CRITICAL') return 'border-l-destructive bg-destructive/5'
  if (severity === 'WARNING') return 'border-l-warning bg-warning-muted'
  return 'border-l-primary bg-primary/5'
}

export default function AlertItem({ alert }) {
  const { type, severity, title, message, is_read } = alert

  return (
    <div
      className={cn(
        'border-l-4 pl-3 py-2 rounded-r-lg text-sm',
        alertColor(severity),
        is_read && 'opacity-60',
      )}
    >
      <div className="font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{type}</div>
    </div>
  )
}
