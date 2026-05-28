import { useState, useEffect } from 'react';
import api from '../services/api';
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

export default function ReportsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/reports/monthly').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const monthName = new Date(data.year, data.month - 1).toLocaleString('en-ET', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Reports & Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Monthly summary — {monthName}</p>
      </div>

      <div className="stat-grid">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{data.totalVerified.count}</div>
            <div className="text-sm text-muted-foreground mt-1">Verified Catches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-success">
              {Math.round(data.totalVerified.total).toLocaleString()} kg
            </div>
            <div className="text-sm text-muted-foreground mt-1">Total Verified Catch</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-destructive">{data.totalRejected.count}</div>
            <div className="text-sm text-muted-foreground mt-1">Rejected Catches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-info">
              {Math.round(data.totalSales.kg_sold).toLocaleString()} kg
            </div>
            <div className="text-sm text-muted-foreground mt-1">Fish Sold</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catch by Species</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Species</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Total (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.bySpecies.map((s) => (
                <TableRow key={s.species}>
                  <TableCell className="font-medium">{s.species}</TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right">
                    {Math.round(s.total_kg).toLocaleString()} kg
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 text-sm">
            <div>
              <div className="text-muted-foreground">Total Revenue</div>
              <div className="text-xl font-bold text-foreground mt-1">
                ETB {Math.round(data.totalSales.revenue).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Fish Sold</div>
              <div className="text-xl font-bold text-foreground mt-1">
                {Math.round(data.totalSales.kg_sold).toLocaleString()} kg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
