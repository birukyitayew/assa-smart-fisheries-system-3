import { Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLogo({ size = 'md', subtitle, className }) {
  const sizes = {
    sm: { box: 'h-8 w-8', icon: 'h-4 w-4', title: 'text-sm', sub: 'text-[10px]' },
    md: { box: 'h-10 w-10', icon: 'h-5 w-5', title: 'text-lg', sub: 'text-xs' },
    lg: { box: 'h-12 w-12', icon: 'h-6 w-6', title: 'text-xl', sub: 'text-xs' },
  };
  const s = sizes[size] ?? sizes.md;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0',
          s.box,
        )}
      >
        <Waves className={s.icon} aria-hidden />
      </div>
      <div className="min-w-0">
        <div className={cn('font-semibold leading-tight tracking-tight text-foreground', s.title)}>
          ASSA
        </div>
        {subtitle && <div className={cn('text-muted-foreground truncate', s.sub)}>{subtitle}</div>}
      </div>
    </div>
  );
}
