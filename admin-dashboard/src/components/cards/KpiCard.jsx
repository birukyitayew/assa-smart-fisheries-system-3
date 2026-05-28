import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { statusClass } from '@/lib/status';

const iconVariants = {
  primary: statusClass('primary'),
  success: statusClass('success'),
  warning: statusClass('warning'),
  destructive: statusClass('danger'),
  info: statusClass('info'),
  muted: statusClass('muted'),
};

function TrendIndicator({ trend, trendLabel }) {
  if (trend == null) return null;
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const color = isFlat
    ? 'text-muted-foreground'
    : isUp
      ? 'text-success'
      : 'text-destructive';

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      {Math.abs(trend)}%
      {trendLabel && <span className="text-muted-foreground ml-0.5">{trendLabel}</span>}
    </span>
  );
}

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  variant = 'primary',
  to,
  trend,
  trendLabel,
}) {
  const content = (
    <CardContent className="flex items-center gap-4 p-5">
      <div
        className={cn(
          'w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
          iconVariants[variant] ?? iconVariants.primary,
        )}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          <TrendIndicator trend={trend} trendLabel={trendLabel} />
        </div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </CardContent>
  );

  if (to) {
    return (
      <Link to={to} className="block group">
        <Card className="transition-all duration-200 group-hover:shadow-md group-hover:border-primary/30 group-hover:-translate-y-0.5">
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="group transition-all duration-200 hover:shadow-sm">
      {content}
    </Card>
  );
}
