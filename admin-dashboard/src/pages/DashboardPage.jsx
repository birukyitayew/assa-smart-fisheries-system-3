import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Fish, Clock, Users, Ship, Banknote, Bell } from 'lucide-react'
import api from '../services/api'
import PageHeader from '../components/layout/PageHeader'
import { usePolling } from '../hooks/usePolling'
import { useRealtime } from '../context/RealtimeContext'
import LiveActivityFeed from '../components/command/LiveActivityFeed'
import CommandQuickLinks from '../components/command/CommandQuickLinks'
import KpiCard from '../components/cards/KpiCard'
import QuotaBar from '../components/cards/QuotaBar'
import AlertItem from '../components/cards/AlertItem'
import CatchesLineChart from '../components/charts/CatchesLineChart'
import SpeciesDonutChart from '../components/charts/SpeciesDonutChart'
import StatusBadge from '../components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function DashboardPage() {
  const { events } = useRealtime()
  const [liveStats, setLiveStats] = useState(null)
  const [stats, setStats] = useState(null)
  const [timeData, setTimeData] = useState([])
  const [speciesData, setSpeciesData] = useState([])
  const [quotas, setQuotas] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recentCatches, setRecentCatches] = useState([])

  const fetchAll = useCallback(async () => {
    try {
      const [liveRes, statsRes, timeRes, speciesRes, quotasRes, alertsRes, catchesRes] = await Promise.all([
        api.get('/admin/command/live-stats'),
        api.get('/admin/dashboard/stats'),
        api.get('/admin/dashboard/catches-over-time'),
        api.get('/admin/dashboard/species-breakdown'),
        api.get('/admin/quotas'),
        api.get('/admin/alerts'),
        api.get('/admin/catches?limit=5'),
      ])
      setLiveStats(liveRes.data)
      setStats(statsRes.data)
      setTimeData(timeRes.data.data)
      setSpeciesData(speciesRes.data.data)
      setQuotas(quotasRes.data.quotas)
      setAlerts(alertsRes.data.alerts.slice(0, 5))
      setRecentCatches(catchesRes.data.catches)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
  }, [])

  usePolling(fetchAll, 10000)

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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
        <KpiCard
          icon={Fish}
          label="Catch Today (kg)"
          value={liveStats?.catchKgToday != null ? Math.round(liveStats.catchKgToday) : '—'}
          variant="success"
        />
        <KpiCard icon={Clock} label="Pending" value={liveStats?.pendingCatches ?? stats?.pendingCatches ?? '—'} variant="warning" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Catches Over Time (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <CatchesLineChart data={timeData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catch by Species (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <SpeciesDonutChart data={speciesData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Catches</CardTitle>
            <Link to="/catches" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
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
              {quotas.map((q) => (
                <QuotaBar key={q.id} species={q.species} current={q.current_month_kg} limit={q.monthly_limit_kg} />
              ))}
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
              {alerts.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
              {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
