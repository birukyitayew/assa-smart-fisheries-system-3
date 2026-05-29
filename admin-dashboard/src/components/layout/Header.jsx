import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Radio } from 'lucide-react';
import api from '../../services/api';
import { useRealtime } from '../../context/RealtimeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ThemeToggle from '../ThemeToggle';
import MobileNav from './MobileNav';

export default function Header() {
  const { t } = useTranslation();
  const { connected } = useRealtime();
  const [alertCount, setAlertCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/admin/alerts');
        setAlertCount(res.data.unreadCount || 0);
      } catch {
        /* ignore polling errors */
      }
    };
    fetchAlerts();
    const id = setInterval(fetchAlerts, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between flex-shrink-0">
      <div className="flex items-start gap-3 min-w-0 w-full lg:flex-1">
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        <div className="flex flex-col gap-2 min-w-0 flex-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{t('header.title')}</h1>
            <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">
              {t('header.subtitle')}
            </p>
          </div>
          <span className="text-xs font-medium text-primary px-2 py-1 rounded-md bg-primary/10 w-fit max-w-full truncate shrink-0">
            {t('header.lakeTana')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full lg:w-auto flex-wrap">
        <ThemeToggle className="lg:hidden" />
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
            connected
              ? 'border-success text-success bg-success-muted'
              : 'border-border text-muted-foreground bg-muted',
          )}
          aria-live="polite"
        >
          <Radio className={cn('h-3 w-3 shrink-0', connected && 'animate-pulse')} />
          <span className="whitespace-nowrap">{connected ? t('header.live') : t('header.offline')}</span>
        </div>
        <Button variant="ghost" size="icon" asChild className="relative shrink-0">
          <Link to="/alerts">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {alertCount > 9 ? '9+' : alertCount}
              </Badge>
            )}
          </Link>
        </Button>
        <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
          {new Date().toLocaleDateString('en-ET', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
        <ThemeToggle className="hidden lg:inline-flex" />
      </div>
    </header>
  );
}
