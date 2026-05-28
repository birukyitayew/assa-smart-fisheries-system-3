import { cn } from '@/lib/utils';

export default function QuotaBar({ species, current, limit }) {
  const pct = Math.min((current / limit) * 100, 100);
  const barColor = pct >= 90 ? 'bg-destructive' : pct >= 75 ? 'bg-warning' : 'bg-primary';
  const textColor =
    pct >= 90 ? 'text-destructive' : pct >= 75 ? 'text-warning' : 'text-muted-foreground';

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-foreground">{species}</span>
        <span className={cn('font-semibold', textColor)}>
          {Math.round(current).toLocaleString()} / {limit.toLocaleString()} kg ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
