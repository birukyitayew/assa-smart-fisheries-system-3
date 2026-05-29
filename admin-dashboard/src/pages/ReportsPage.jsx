import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  FileText,
  ShieldAlert,
  Ship,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/layout/PageHeader';
import KpiCard from '../components/cards/KpiCard';
import { generateProfessionalReportPdf } from '../lib/reportPdf';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const currencyFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  maximumFractionDigits: 0,
});

function formatKg(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} kg`;
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(Number(value || 0)));
}

function formatPct(value) {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/admin/reports/professional', { params: { period } });
      setData(res.data);
    } catch (err) {
      setLoadError(err.response?.data?.error || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const report =
        data || (await api.get('/admin/reports/professional', { params: { period } })).data;
      generateProfessionalReportPdf(report);
    } finally {
      setDownloading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-2xl" />
        <div className="stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Professional command-center PDF reports for daily, weekly, monthly, and yearly fisheries performance."
        actions={
          <Button onClick={downloadPdf} disabled={downloading || !data}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={period} onValueChange={setPeriod} className="overflow-x-auto">
          <TabsList className="w-max">
            {PERIODS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {data && (
          <Badge variant="secondary" className="w-fit">
            {data.periodLabel} report • {data.executiveSummary.riskLevel} risk
          </Badge>
        )}
      </div>

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load professional report: {loadError}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="stat-grid">
          <KpiCard
            icon={FileText}
            label="Verified catch"
            value={formatKg(data.kpis.verifiedCatchKg)}
            variant="success"
          />
          <KpiCard
            icon={TrendingUp}
            label="Revenue"
            value={formatCurrency(data.kpis.revenue)}
            variant="primary"
          />
          <KpiCard
            icon={Ship}
            label="Active fleet"
            value={`${data.kpis.activeBoats}/${data.kpis.totalBoats}`}
            variant="info"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Open violations"
            value={data.kpis.openViolations}
            variant={data.kpis.openViolations > 0 ? 'destructive' : 'success'}
          />
        </div>
      )}

      {data && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Catch trend
              </div>
              <div className="mt-1 text-xl font-semibold">
                {formatPct(data.executiveSummary.catchTrendPct)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Revenue trend
              </div>
              <div className="mt-1 text-xl font-semibold">
                {formatPct(data.executiveSummary.revenueTrendPct)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Verification rate
              </div>
              <div className="mt-1 text-xl font-semibold">
                {data.executiveSummary.verificationRatePct}%
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Avg market price
              </div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(data.kpis.avgPrice)}/kg
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Catch by Species</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Species</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.speciesMix || []).map((species) => (
                  <TableRow key={species.species}>
                    <TableCell className="font-medium">{species.species}</TableCell>
                    <TableCell className="text-right">{species.submissions}</TableCell>
                    <TableCell className="text-right">{species.verified_count}</TableCell>
                    <TableCell className="text-right">{formatKg(species.total_kg)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Quota Utilization</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Species</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.quotaStatus || []).map((quota) => (
                  <TableRow key={quota.species}>
                    <TableCell className="font-medium">{quota.species}</TableCell>
                    <TableCell className="text-right">{formatKg(quota.current_month_kg)}</TableCell>
                    <TableCell className="text-right">{formatKg(quota.monthly_limit_kg)}</TableCell>
                    <TableCell className="text-right">{quota.usage_pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Zone Performance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Verified</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.zonePerformance || []).map((zone) => (
                <TableRow key={zone.zone_name}>
                  <TableCell className="font-medium">{zone.zone_name}</TableCell>
                  <TableCell className="text-right">{zone.submissions}</TableCell>
                  <TableCell className="text-right">{zone.verified_count}</TableCell>
                  <TableCell className="text-right">{zone.rejected_count}</TableCell>
                  <TableCell className="text-right">{formatKg(zone.total_kg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Market Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Species</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.marketPrices || []).map((market) => (
                <TableRow key={market.species}>
                  <TableCell className="font-medium">{market.species}</TableCell>
                  <TableCell className="text-right">{formatKg(market.kg_sold)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(market.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(market.avg_price)}/kg</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
