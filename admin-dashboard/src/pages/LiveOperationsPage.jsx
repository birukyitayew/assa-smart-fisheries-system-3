import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Clock, Package, Banknote } from 'lucide-react';
import api from '../services/api';
import { useRegion } from '../context/RegionContext';
import PageHeader from '../components/layout/PageHeader';
import { usePolling } from '../hooks/usePolling';
import { useRealtime } from '../context/RealtimeContext';
import LiveActivityFeed from '../components/command/LiveActivityFeed';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/cards/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function LiveOperationsPage() {
  const { events, connected } = useRealtime();
  const { selectedRegionId } = useRegion();
  const [liveStats, setLiveStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const [liveRes, catchesRes, txRes] = await Promise.all([
        api.get('/admin/command/live-stats'),
        api.get('/admin/catches?status=PENDING&limit=15'),
        api.get('/admin/market/transactions?limit=20'),
      ]);
      setLiveStats(liveRes.data);
      setPending(catchesRes.data.catches);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error('Live ops fetch error:', err);
    }
  }, [selectedRegionId]);

  usePolling(fetchAll, 8000, !connected);

  useEffect(() => {
    const orderEvents = events.filter((e) =>
      ['catch.submitted', 'catch.approved', 'order.placed'].includes(e.type),
    );
    if (orderEvents.length > 0) {
      fetchAll();
    }
  }, [events, fetchAll]);

  const orderEvents = events.filter((e) => e.type === 'order.placed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Operations"
        description="Real-time transactions, pending queue, and activity stream"
        actions={
          pending.length > 0 ? (
            <Badge variant="secondary" className="text-sm">
              {pending.length} pending review
            </Badge>
          ) : null
        }
      />

      <div className="stat-grid">
        <KpiCard
          icon={Fish}
          label="Catch Today (kg)"
          value={liveStats?.catchKgToday != null ? `${Math.round(liveStats.catchKgToday)}` : '—'}
          variant="success"
        />
        <KpiCard
          icon={Clock}
          label="Pending Catches"
          value={liveStats?.pendingCatches ?? '—'}
          variant="warning"
        />
        <KpiCard
          icon={Package}
          label="Orders (1h)"
          value={liveStats?.ordersLastHour ?? '—'}
          variant="primary"
        />
        <KpiCard
          icon={Banknote}
          label="Revenue Today"
          value={
            liveStats?.revenueToday != null
              ? `ETB ${Math.round(liveStats.revenueToday).toLocaleString()}`
              : '—'
          }
          variant="info"
        />
      </div>

      <div className="content-grid">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Transaction Ticker</CardTitle>
              <span className="text-xs text-muted-foreground">
                {connected ? 'Streaming live' : 'Polling fallback'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Time</TableHead>
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
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.ordered_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {orderEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SSE — Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orderEvents.slice(0, 5).map((e) => (
                  <div key={e.id} className="text-sm border-b border-border/50 pb-2">
                    {e.label}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <LiveActivityFeed maxHeight="280px" />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Queue</CardTitle>
              <Link to="/catches?status=PENDING" className="text-sm text-primary hover:underline">
                Review →
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending catches</p>
              ) : (
                pending.map((c) => (
                  <Link
                    key={c.id}
                    to={`/catches/${c.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-sm">{c.fisher_name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.species} · {c.quantity_kg} kg · {c.zone_name}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
