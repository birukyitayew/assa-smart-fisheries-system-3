import { useState, useCallback, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Brain, RefreshCw, TrendingUp, Package, Fish } from 'lucide-react'
import api from '../services/api'
import { useRegion } from '../context/RegionContext'
import PageHeader from '../components/layout/PageHeader'
import KpiCard from '../components/cards/KpiCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export default function IntelligencePage() {
  const { selectedRegionId } = useRegion()
  const [data, setData] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const fetchOverview = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await api.get('/admin/intelligence/overview')
      setData(res.data)
    } catch (err) {
      console.error('Intelligence error:', err)
      setLoadError(err.response?.data?.error || err.message || 'Failed to load intelligence')
    }
  }, [selectedRegionId])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await api.post('/admin/intelligence/refresh-snapshots', { days: 14 })
      await fetchOverview()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const priceBySpecies = {}
  ;(data?.priceTrends || []).forEach((row) => {
    if (!priceBySpecies[row.species]) priceBySpecies[row.species] = []
    priceBySpecies[row.species].push({
      date: row.date?.slice(5) || row.date,
      price: Math.round(row.avg_price || 0),
    })
  })

  const speciesKeys = Object.keys(priceBySpecies)
  const chartSpecies = speciesKeys[0]
  const priceChartData = chartSpecies ? priceBySpecies[chartSpecies] : []

  const snapshotByDate = {}
  ;(data?.snapshots || []).forEach((s) => {
    const key = s.snapshot_date
    if (!snapshotByDate[key]) snapshotByDate[key] = { date: key.slice(5), listed: 0, sold: 0 }
    snapshotByDate[key].listed += s.total_listed_kg || 0
    snapshotByDate[key].sold += s.total_sold_kg || 0
  })
  const barData = Object.values(snapshotByDate).slice(-14)

  const shortages = [
    ...(data?.quotaShortages || []).map((q) => ({
      type: 'Quota',
      species: q.species,
      detail: `${q.usage_pct}% of monthly limit used`,
      severity: 'warning',
    })),
    ...(data?.stockLow || []).map((s) => ({
      type: 'Stock',
      species: s.species,
      detail: `${Math.round(s.available_kg)} kg available`,
      severity: 'destructive',
    })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Intelligence"
        description="Price trends, daily snapshots, and shortage signals (GC-10)"
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh snapshots
          </Button>
        }
      />

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load market intelligence: {loadError}. Restart the backend (
            <code className="text-xs">npm run dev --prefix backend</code>
            ) so Phase 3 routes are active.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard icon={Fish} label="Species tracked" value={data?.speciesCount ?? '—'} variant="primary" />
        <KpiCard
          icon={TrendingUp}
          label="Avg price Δ (7d)"
          value={data?.priceDeltaPct != null ? `${data.priceDeltaPct > 0 ? '+' : ''}${data.priceDeltaPct}%` : '—'}
          variant={data?.priceDeltaPct > 0 ? 'warning' : 'success'}
        />
        <KpiCard
          icon={Package}
          label="Sold kg (7d)"
          value={data?.totalSoldKg7d != null ? `${Math.round(data.totalSoldKg7d)} kg` : '—'}
          variant="success"
        />
        <KpiCard icon={Brain} label="Shortage signals" value={shortages.length} variant="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Price trend — {chartSpecies || 'species'} (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {priceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`ETB ${v}`, 'Avg/kg']} />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No price history yet — approve catches or place orders.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listed vs sold (snapshots)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="listed" name="Listed kg" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sold" name="Sold kg" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Run refresh snapshots to populate chart data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shortage warnings</CardTitle>
        </CardHeader>
        <CardContent>
          {shortages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active shortage signals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortages.map((s, i) => (
                  <TableRow key={`${s.species}-${s.type}-${i}`}>
                    <TableCell>
                      <Badge variant={s.severity === 'destructive' ? 'destructive' : 'secondary'}>
                        {s.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{s.species}</TableCell>
                    <TableCell className="text-muted-foreground">{s.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
