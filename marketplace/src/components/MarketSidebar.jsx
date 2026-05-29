import { useTranslation } from 'react-i18next';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Anchor } from 'lucide-react';
import ActivityFeed from './ActivityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MarketSidebar({ stats, activity }) {
  const { t } = useTranslation();
  return (
    <aside className="w-56 flex-shrink-0 space-y-5 hidden xl:block">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('marketSidebar.marketStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={stats.weeklyTrend}>
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip formatter={(v) => [`${v} kg`]} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('marketSidebar.totalListings')}</span>
                  <span className="font-semibold">{stats.activeListings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sellers</span>
                  <span className="font-semibold">{stats.totalSellers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fish Sold (kg)</span>
                  <span className="font-semibold text-primary">{Math.round(stats.fishSoldKg)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('marketSidebar.avgPrice')}</span>
                  <span className="font-semibold">ETB {stats.avgPrice}/kg</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('marketSidebar.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activity={activity} />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5 text-center">
        <CardContent className="pt-6">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Anchor className="h-5 w-5" aria-hidden />
          </div>
          <h4 className="font-semibold text-foreground text-sm">Become a Verified Seller</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Register as a licensed fisher to list your catches.
          </p>
          <Button variant="link" size="sm" className="mt-3" asChild>
            <a href="http://localhost:3002" target="_blank" rel="noreferrer">
              Open Fisher App →
            </a>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
