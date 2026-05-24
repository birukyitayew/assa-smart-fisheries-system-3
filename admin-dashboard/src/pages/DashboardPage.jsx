import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Fish, Clock, Users, Ship, Banknote, Bell, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { useRegion } from '../context/RegionContext'
import PageHeader from '../components/layout/PageHeader'
import { usePolling } from '../hooks/usePolling'
import { useRealtime } from '../context/RealtimeContext'
import LiveActivityFeed from '../components/command/LiveActivityFeed'
import CommandQuickLinks from '../components/command/CommandQuickLinks'
import CommandMap from '../components/command/CommandMap'
import KpiCard from '../components/cards/KpiCard'
import QuotaBar from '../components/cards/QuotaBar'
import AlertItem from '../components/cards/AlertItem'
import CatchesLineChart from '../components/charts/CatchesLineChart'
import SpeciesDonutChart from '../components/charts/SpeciesDonutChart'
import StatusBadge from '../components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function DashboardPage() {
  const { events, connected } = useRealtime()
  const { selectedRegionId, mapCenter } = useRegion()
  const [liveStats, setLiveStats] = useState(null)
  const [stats, setStats] = useState(null)
  const [timeData, setTimeData] = useState([])
  const [speciesData, setSpeciesData] = useState([])
  const [quotas, setQuotas] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recentCatches, setRecentCatches] = useState([])
  const [mapLayers, setMapLayers] = useState({ zones: [], fleet: [], catches: [] })
  const [sectionErrors, setSectionErrors] = useState({})

  const setError = useCallback((key) => {
    setSectionErrors((prev) => ({ ...prev, [key]: true }))
  }, [])

  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/admin/command/live-stats')
      setLiveStats(res.data)
      setSectionErrors((e) => ({ ...e, live: false }))
    } catch { setError('live') }
  }, [setError])

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, timeRes, speciesRes] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/catches-over-time'),
        api.get('/admin/dashboard/species-breakdown'),
      ])
      setStats(statsRes.data)
      setTimeData(timeRes.data.data)
      setSpeciesData(speciesRes.data.data)
      setSectionErrors((e) => ({ ...e, stats: false }))
    } catch { setError('stats') }
  }, [setError])

  const fetchOperational = useCallback(async () => {
    try {
      const [quotasRes, alertsRes, catchesRes] = await Promise.all([
        api.get('/admin/quotas'),
        api.get('/admin/alerts'),
        api.get('/admin/catches?limit=5'),
      ])
      setQuotas(quotasRes.data.quotas)
      setAlerts(alertsRes.data.alerts.slice(0, 5))
      setRecentCatches(catchesRes.data.catches)
      setSectionErrors((e) => ({ ...e, ops: false }))
    } catch { setError('ops') }
  }, [setError])

  const fetchMap = useCallback(async () => {
    try {
      const res = await api.get('/admin/map/layers')
      setMapLayers(res.data)
      setSectionErrors((e) => ({ ...e, map: false }))
    } catch { setError('map') }
  }, [setError])

  const fetchAll = useCallback(() => {
    fetchLive()
    fetchStats()
    fetchOperational()
    fetchMap()
  }, [fetchLive, fetchStats, fetchOperational, fetchMap])

  usePolling(fetchAll, 10000, !connected)

  useEffect(() => {
    if (events.length > 0) fetchAll()
  }, [events.length, fetchAll])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Overview"
        description="Lake Tana Fisheries — Live command center"
        actions={
          <Link to="/map" className="text-sm text-primary hover:underline">
            Open full map →
          </Link>
        }
      />

      <CommandQuickLinks />

      {((liveStats?.pendingCatches ?? stats?.pendingCatches) > 0) && (
        <Card className="border-warning/30 bg-warning/5 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-semibold text-warning-foreground">Pending Catches Awaiting Review</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  There are <span className="font-bold text-warning-foreground">{liveStats?.pendingCatches ?? stats?.pendingCatches}</span> catches that need verification. Unapproved catches will not show as verified in statistics or listings.
                </p>
              </div>
            </div>
            <Link
              to="/catches"
              className="px-4 py-2 text-xs font-semibold rounded-md bg-warning text-warning-foreground hover:bg-warning/90 transition-colors shrink-0 shadow-sm"
            >
              Review Catches Now
            </Link>
          </CardContent>
        </Card>
      )}

      {sectionErrors.live && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Failed to load live metrics. Click retry to refresh.</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchLive}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Lake Tana — Live Map</CardTitle>
          <Link to="/map" className="text-sm text-primary hover:underline shrink-0">
            Full screen →
          </Link>
        </CardHeader>
        <CardContent className="min-w-0 pt-0">
          {sectionErrors.map ? (
            <div className="h-[min(45vh,380px)] min-h-[240px] flex flex-col items-center justify-center gap-2 border border-dashed rounded-lg bg-muted/20">
              <AlertTriangle className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Could not load live map layers</p>
              <Button size="sm" variant="outline" onClick={fetchMap}>Retry Map Load</Button>
            </div>
          ) : (
            <CommandMap
              layers={mapLayers}
              center={mapCenter}
              zoom={mapCenter.zoom}
              mapKey={`dashboard-map-${selectedRegionId}`}
              className="h-[min(45vh,380px)] min-h-[240px] sm:min-h-[280px]"
            />
          )}
        </CardContent>
      </Card>

      <div className="kpi-grid">
        <KpiCard
          icon={Fish}
          label="Catch Today (kg)"
          value={
            liveStats?.catchKgToday != null && liveStats?.pendingKgToday != null
              ? Math.round(liveStats.catchKgToday + liveStats.pendingKgToday)
              : '—'
          }
          sub={
            liveStats?.pendingKgToday
              ? `${Math.round(liveStats.catchKgToday)} kg verified + ${Math.round(liveStats.pendingKgToday)} kg pending`
              : liveStats?.catchKgToday != null
              ? 'All catches verified'
              : ''
          }
          variant="success"
        />
        <KpiCard icon={Clock} label="Pending" value={liveStats?.pendingCatches ?? stats?.pendingCatches ?? '—'} variant="warning" to="/catches" />
        <KpiCard icon={Users} label="Active Fishers" value={liveStats?.activeFishers ?? '—'} variant="primary" />
        <KpiCard
          icon={Ship}
          label="Boats Active"
          value={liveStats?.activeBoats ?? '—'}
          variant="info"
          to="/fleet"
        />
        <KpiCard
          icon={Banknote}
          label="Revenue Today"
          value={
            liveStats?.revenueToday != null
              ? `ETB ${Math.round(liveStats.revenueToday).toLocaleString()}`
              : '—'
          }
          variant="success"
        />
        <KpiCard icon={Bell} label="Alerts" value={stats?.activeAlerts ?? '—'} variant="destructive" />
      </div>

      <div className="content-grid">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Catches Over Time (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionErrors.stats ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed rounded-lg">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Failed to load catch trends</p>
                <Button size="sm" variant="outline" onClick={fetchStats}>Retry</Button>
              </div>
            ) : (
              <CatchesLineChart data={timeData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catch by Species (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionErrors.stats ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2 bg-muted/10 border border-dashed rounded-lg">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Failed to load species breakdown</p>
                <Button size="sm" variant="outline" onClick={fetchStats}>Retry</Button>
              </div>
            ) : (
              <SpeciesDonutChart data={speciesData} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="content-grid">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Recent Catches</CardTitle>
            <Link to="/catches" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {sectionErrors.ops ? (
              <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
                <AlertTriangle className="h-6 w-6 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Failed to load recent catches</p>
                <Button size="sm" variant="outline" onClick={fetchOperational}>Retry</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fisher</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Qty (kg)</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCatches.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.fisher_name}</TableCell>
                      <TableCell>{c.species}</TableCell>
                      <TableCell>{c.quantity_kg}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {c.zone_name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentCatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        No catches yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <LiveActivityFeed maxHeight="200px" />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Quota Usage</CardTitle>
              <Link to="/quotas" className="text-sm text-primary hover:underline">
                Manage →
              </Link>
            </CardHeader>
            <CardContent>
              {sectionErrors.ops ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-center">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Failed to load quotas</p>
                  <Button size="sm" variant="outline" onClick={fetchOperational}>Retry</Button>
                </div>
              ) : (
                quotas.map((q) => (
                  <QuotaBar key={q.id} species={q.species} current={q.current_month_kg} limit={q.monthly_limit_kg} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Alerts</CardTitle>
              <Link to="/alerts" className="text-sm text-primary hover:underline">
                All →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectionErrors.ops ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-center">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Failed to load alerts</p>
                  <Button size="sm" variant="outline" onClick={fetchOperational}>Retry</Button>
                </div>
              ) : (
                <>
                  {alerts.map((a) => (
                    <AlertItem key={a.id} alert={a} />
                  ))}
                  {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
