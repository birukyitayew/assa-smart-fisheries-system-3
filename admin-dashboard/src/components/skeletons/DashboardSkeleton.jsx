import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 'h-[200px]' }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height} rounded-lg`} />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t border-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="h-4 flex-1"
                  style={{ maxWidth: j === 0 ? '120px' : '80px' }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>

      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="content-grid">
        <ChartSkeleton height="h-[200px]" />
        <ChartSkeleton height="h-[200px]" />
      </div>

      <div className="content-grid">
        <TableSkeleton rows={5} cols={5} />
        <div className="space-y-6">
          <ChartSkeleton height="h-[150px]" />
          <ChartSkeleton height="h-[100px]" />
        </div>
      </div>
    </div>
  );
}

export { KpiSkeleton, ChartSkeleton, TableSkeleton };
