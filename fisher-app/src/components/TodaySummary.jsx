import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TodaySummary({ summary }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today&apos;s Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">{summary.total_kg}</div>
            <div className="text-xs text-muted-foreground">Total kg</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              {summary.fishing_trips_today ?? summary.trips_today ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Trips today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">{summary.verified_kg}</div>
            <div className="text-xs text-muted-foreground">Verified kg</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
