import { useRealtime } from '../../context/RealtimeContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const typeColors = {
  'catch.submitted': 'text-warning',
  'catch.approved': 'text-success',
  'catch.rejected': 'text-destructive',
  'listing.created': 'text-info',
  'order.placed': 'text-primary',
  'quota.warning': 'text-warning',
  'violation.created': 'text-destructive',
  'inspection.assigned': 'text-info',
  'inspection.completed': 'text-success',
}

export default function LiveActivityFeed({ className, maxHeight = '320px' }) {
  const { events } = useRealtime()

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold">Live Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <ScrollArea style={{ height: maxHeight }}>
          <ul className="space-y-2 pr-3">
            {events.length === 0 ? (
              <li className="text-xs text-muted-foreground py-4 text-center">Waiting for events…</li>
            ) : (
              events.map((e) => (
                <li key={e.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
                  <div className="flex justify-between gap-2 mb-0.5">
                    <span className={cn('font-medium uppercase tracking-wide', typeColors[e.type] || 'text-muted-foreground')}>
                      {e.type.replace('.', ' ')}
                    </span>
                    <time className="text-muted-foreground shrink-0">
                      {new Date(e.timestamp).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className="text-foreground/90 leading-snug">{e.label}</p>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
