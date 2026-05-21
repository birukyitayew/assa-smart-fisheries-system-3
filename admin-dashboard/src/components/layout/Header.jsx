import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Radio } from 'lucide-react'
import api from '../../services/api'
import { useRealtime } from '../../context/RealtimeContext'
import { useRegion } from '../../context/RegionContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function Header() {
  const { t } = useTranslation()
  const { connected } = useRealtime()
  const {
    regions,
    selectedRegionId,
    selectRegion,
    canSelectRegion,
    regionLabel,
    isRegionalAdmin,
  } = useRegion()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/admin/alerts')
        setAlertCount(res.data.unreadCount || 0)
      } catch {
        /* ignore polling errors */
      }
    }
    fetchAlerts()
    const id = setInterval(fetchAlerts, 15000)
    return () => clearInterval(id)
  }, [selectedRegionId])

  return (
    <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-sm font-semibold text-foreground">{t('header.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
        </div>
        {canSelectRegion ? (
          <Select
            value={selectedRegionId == null ? 'all' : String(selectedRegionId)}
            onValueChange={(v) => selectRegion(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-8 w-[200px] text-xs" aria-label={t('region.selectorLabel')}>
              <SelectValue placeholder={t('region.allLakes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('region.allLakes')}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs font-medium text-primary px-2 py-1 rounded-md bg-primary/10">
            {regionLabel}
            {isRegionalAdmin ? ` · ${t('region.regionalScope')}` : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
            connected
              ? 'border-success text-success bg-success-muted'
              : 'border-border text-muted-foreground bg-muted',
          )}
          aria-live="polite"
        >
          <Radio className={cn('h-3 w-3', connected && 'animate-pulse')} />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
        <Button variant="ghost" size="icon" asChild className="relative">
          <Link to="/alerts">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                {alertCount > 9 ? '9+' : alertCount}
              </Badge>
            )}
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-ET', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>
    </header>
  )
}
