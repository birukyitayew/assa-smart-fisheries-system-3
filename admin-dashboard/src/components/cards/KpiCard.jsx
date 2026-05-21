import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { statusClass } from '@/lib/status'

const iconVariants = {
  primary: statusClass('primary'),
  success: statusClass('success'),
  warning: statusClass('warning'),
  destructive: statusClass('danger'),
  info: statusClass('info'),
  muted: statusClass('muted'),
}

export default function KpiCard({ icon: Icon, label, value, sub, variant = 'primary', to }) {
  const content = (
    <CardContent className="flex items-center gap-4 p-5">
      <div
        className={cn(
          'w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0',
          iconVariants[variant] ?? iconVariants.primary,
        )}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden />}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </CardContent>
  )

  if (to) {
    return (
      <Link to={to} className="block group">
        <Card className="transition-shadow group-hover:shadow-md group-hover:border-primary/30">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
