import { useState, useCallback } from 'react'
import { Banknote, ClipboardList, Package, Fish } from 'lucide-react'
import api from '../services/api'
import { useRegion } from '../context/RegionContext'
import PageHeader from '../components/layout/PageHeader'
import { usePolling } from '../hooks/usePolling'
import KpiCard from '../components/cards/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export default function MarketMonitorPage() {
  const { selectedRegionId } = useRegion()
  const [overview, setOverview] = useState(null)
  const [buyers, setBuyers] = useState([])
  const [sellers, setSellers] = useState([])
  const [speciesPrices, setSpeciesPrices] = useState([])
  const [shortages, setShortages] = useState({ quotaShortages: [], stockLow: [] })
  const [transactions, setTransactions] = useState([])
  const [network, setNetwork] = useState([])

  const fetchAll = useCallback(async () => {
    try {
      const [ov, b, s, sp, sh, tx, net] = await Promise.all([
        api.get('/admin/market/overview'),
        api.get('/admin/market/buyers'),
        api.get('/admin/market/sellers'),
        api.get('/admin/market/species-prices'),
        api.get('/admin/market/shortages'),
        api.get('/admin/market/transactions?limit=25'),
        api.get('/admin/market/network'),
      ])
      setOverview(ov.data)
      setBuyers(b.data.buyers)
      setSellers(s.data.sellers)
      setSpeciesPrices(sp.data.data)
      setShortages(sh.data)
      setTransactions(tx.data.transactions)
      setNetwork(net.data.edges)
    } catch (err) {
      console.error('Market monitor error:', err)
    }
  }, [selectedRegionId])

  usePolling(fetchAll, 15000)

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Market Monitor"
        description="Total market visibility — buyers, sellers, prices, shortages, supply chain"
      />

      <div className="kpi-grid">
        <KpiCard
          icon={Banknote}
          label="Revenue Today"
          value={
            overview?.revenueToday != null
              ? `ETB ${Math.round(overview.revenueToday).toLocaleString()}`
              : '—'
          }
          variant="success"
        />
        <KpiCard icon={ClipboardList} label="Orders Today" value={overview?.ordersToday ?? '—'} variant="primary" />
        <KpiCard
          icon={Package}
          label="Stock Listed (kg)"
          value={
            overview?.activeListingsKg != null
              ? Math.round(overview.activeListingsKg).toLocaleString()
              : '—'
          }
          variant="warning"
        />
        <KpiCard
          icon={Fish}
          label="Top Species (7d)"
          value={overview?.topSpecies?.[0]?.species ?? '—'}
          sub={overview?.topSpecies?.[0] ? `${overview.topSpecies[0].kg_sold} kg sold` : undefined}
          variant="info"
        />
      </div>

      {(shortages.quotaShortages?.length > 0 || shortages.stockLow?.length > 0) && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-base text-warning">Shortage Warnings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {shortages.quotaShortages?.map((q) => (
              <Badge key={q.species} variant="outline" className="border-warning text-warning">
                {q.species} quota {q.usage_pct}%
              </Badge>
            ))}
            {shortages.stockLow?.map((s) => (
              <Badge key={s.species} variant="outline" className="border-destructive/40 text-destructive">
                {s.species} low stock ({s.available_kg} kg)
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="min-w-0">
        <div className="w-full overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="w-max flex-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="prices">Species & Prices</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="network">Supply Chain</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Species Sold (7 days)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="w-full h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.topSpecies || []} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="species" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                      formatter={(v) => [`${v} kg`, 'Sold']}
                    />
                    <Bar dataKey="kg_sold" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buyers" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Volume (kg)</TableHead>
                    <TableHead>Spend (ETB)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.location || '—'}</TableCell>
                      <TableCell>{b.order_count}</TableCell>
                      <TableCell>{Math.round(b.total_kg)}</TableCell>
                      <TableCell>{Math.round(b.total_spend).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {buyers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No buyer statistics available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fisher</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Verified (kg)</TableHead>
                    <TableHead>Listed (kg)</TableHead>
                    <TableHead>Revenue (ETB)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((s) => (
                    <TableRow key={s.fisher_id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.license_number}</TableCell>
                      <TableCell>{Math.round(s.verified_kg)}</TableCell>
                      <TableCell>{Math.round(s.listed_kg)}</TableCell>
                      <TableCell>{Math.round(s.revenue).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {sellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No fisher statistics available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Species</TableHead>
                    <TableHead>Avg Order Price</TableHead>
                    <TableHead>Avg Listing Price</TableHead>
                    <TableHead>Orders (7d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {speciesPrices.map((r) => (
                    <TableRow key={r.species}>
                      <TableCell className="font-medium">{r.species}</TableCell>
                      <TableCell>
                        {r.avg_order_price != null ? `ETB ${r.avg_order_price}/kg` : '—'}
                      </TableCell>
                      <TableCell>
                        {r.avg_listing_price != null ? `ETB ${r.avg_listing_price}/kg` : '—'}
                      </TableCell>
                      <TableCell>{r.order_count}</TableCell>
                    </TableRow>
                  ))}
                  {speciesPrices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        No pricing statistics available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.reference_id}</TableCell>
                      <TableCell>{t.buyer_name}</TableCell>
                      <TableCell>{t.seller_name}</TableCell>
                      <TableCell>{t.species}</TableCell>
                      <TableCell>{t.quantity_kg} kg</TableCell>
                      <TableCell>ETB {Math.round(t.total_price).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(t.ordered_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No recent transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Fisher → Buyer Transaction Network</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller (Fisher)</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {network.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.seller}</TableCell>
                      <TableCell>{e.buyer}</TableCell>
                      <TableCell>{e.species}</TableCell>
                      <TableCell>{e.quantity_kg} kg</TableCell>
                      <TableCell>ETB {Math.round(e.total_price).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{e.reference_id}</TableCell>
                    </TableRow>
                  ))}
                  {network.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No network connections mapped yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
