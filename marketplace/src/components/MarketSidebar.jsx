import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Anchor, TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react';
import ActivityFeed from './ActivityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MarketSidebar({ stats, activity }) {
  return (
    <aside className="w-64 flex-shrink-0 space-y-6 hidden xl:block">
      {/* Market Overview Panel */}
      <Card className="border border-border/75 bg-card/75 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
            Market Volume
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary animate-pulse" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {stats && (
            <>
              {/* Premium Area Chart with Glow Gradient */}
              <div className="h-16 w-full -mx-1 mb-4 select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.weeklyTrend}
                    margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                  >
                    <defs>
                      <linearGradient id="marketVolumeGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="kg"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#marketVolumeGlow)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ display: 'none' }}
                      itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(v) => [`${v} kg`]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Symmetrical Stats Metrics */}
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex justify-between items-center bg-accent/35 hover:bg-accent/65 border border-border/30 rounded-xl p-2.5 transition-all duration-300">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Active Listings
                  </span>
                  <span className="font-extrabold text-foreground">{stats.activeListings}</span>
                </div>
                <div className="flex justify-between items-center bg-accent/35 hover:bg-accent/65 border border-border/30 rounded-xl p-2.5 transition-all duration-300">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Total Sellers
                  </span>
                  <span className="font-extrabold text-foreground">{stats.totalSellers}</span>
                </div>
                <div className="flex justify-between items-center bg-accent/35 hover:bg-accent/65 border border-border/30 rounded-xl p-2.5 transition-all duration-300">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-success" /> Fish Sold (Volume)
                  </span>
                  <span className="font-extrabold text-foreground">
                    {Math.round(stats.fishSoldKg)} kg
                  </span>
                </div>
                <div className="flex justify-between items-center bg-accent/35 hover:bg-accent/65 border border-border/30 rounded-xl p-2.5 transition-all duration-300">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Avg Price Index
                  </span>
                  <span className="font-extrabold text-primary">ETB {stats.avgPrice}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Panel */}
      <Card className="border border-border/75 bg-card/75 backdrop-blur-sm rounded-2xl shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
            Market Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ActivityFeed activity={activity} />
        </CardContent>
      </Card>

      {/* Premium Indigo Promotional Widget */}
      <Card className="border border-primary/25 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-center rounded-2xl shadow-md relative overflow-hidden group">
        {/* Radial Lighting overlay */}
        <div className="absolute -top-12 -right-12 h-36 w-36 bg-primary/25 rounded-full filter blur-xl opacity-45 pointer-events-none transition-all duration-500 group-hover:scale-110" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 bg-purple-500/10 rounded-full filter blur-xl opacity-45 pointer-events-none" />

        <CardContent className="pt-8 px-6 pb-6 relative z-10 space-y-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-sm">
            <Anchor className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-sm">Become a Verified Seller</h4>
            <p className="text-xs text-slate-300 leading-relaxed px-1">
              Register your boat and license today to legally sell verified catches directly.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="default"
              className="w-full bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl shadow-md h-9.5 text-xs transition-all duration-300 active:scale-[0.98]"
              asChild
            >
              <a href="http://localhost:3002" target="_blank" rel="noreferrer">
                Open Fisher App →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
