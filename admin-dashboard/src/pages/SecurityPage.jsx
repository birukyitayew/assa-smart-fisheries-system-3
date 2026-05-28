import { useState, useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Activity, Eye, Filter, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import KpiCard from '../components/cards/KpiCard';
import { cn } from '@/lib/utils';

const DEMO_EVENTS = [
  { id: 1, type: 'AUTH_FAILURE', severity: 'HIGH', message: 'Multiple failed login attempts from IP 196.188.45.12 — account dawit@fisheries.gov.et', user: 'System', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), status: 'DETECTED' },
  { id: 2, type: 'ZONE_VIOLATION', severity: 'CRITICAL', message: 'Boat "Silver Fish" (BT-2023-004) entered Core Protected Area without authorization', user: 'GPS Tracking', timestamp: new Date(Date.now() - 12 * 60000).toISOString(), status: 'ACTIVE' },
  { id: 3, type: 'DATA_ANOMALY', severity: 'HIGH', message: 'Catch submission 280kg from Kebede Molla — 5.6x above daily average. Statistical outlier flagged.', user: 'Anomaly Engine', timestamp: new Date(Date.now() - 25 * 60000).toISOString(), status: 'INVESTIGATING' },
  { id: 4, type: 'PRIVILEGE_ESCALATION', severity: 'MEDIUM', message: 'User tigist@fisheries.gov.et attempted to access superadmin endpoint /api/admin/system-config', user: 'Auth Guard', timestamp: new Date(Date.now() - 40 * 60000).toISOString(), status: 'BLOCKED' },
  { id: 5, type: 'GPS_TAMPERING', severity: 'HIGH', message: 'Simultaneous GPS signal loss from 3 boats in North Zone — possible signal jamming detected', user: 'Fleet Monitor', timestamp: new Date(Date.now() - 55 * 60000).toISOString(), status: 'MONITORING' },
  { id: 6, type: 'RATE_LIMIT', severity: 'LOW', message: 'Rate limit triggered for API key ending ...x4f2 — 312 requests in 15min window', user: 'API Gateway', timestamp: new Date(Date.now() - 70 * 60000).toISOString(), status: 'MITIGATED' },
  { id: 7, type: 'MARKET_FRAUD', severity: 'MEDIUM', message: 'Price manipulation pattern detected — 3 sellers coordinating Nile Perch pricing at 45% above market', user: 'Market Intel', timestamp: new Date(Date.now() - 90 * 60000).toISOString(), status: 'INVESTIGATING' },
  { id: 8, type: 'AUTH_SUCCESS', severity: 'INFO', message: 'Successful login: regional@ziway.gov.et from new device (Firefox, Ubuntu)', user: 'Auth Service', timestamp: new Date(Date.now() - 120 * 60000).toISOString(), status: 'LOGGED' },
  { id: 9, type: 'COMPLIANCE_ALERT', severity: 'MEDIUM', message: 'Fisher compliance score dropped below threshold: Worku Bekele (score: 45, status: SUSPENDED)', user: 'Compliance Engine', timestamp: new Date(Date.now() - 150 * 60000).toISOString(), status: 'FLAGGED' },
  { id: 10, type: 'SYSTEM_HEALTH', severity: 'LOW', message: 'Database connection pool utilization at 78% — approaching threshold', user: 'System Monitor', timestamp: new Date(Date.now() - 180 * 60000).toISOString(), status: 'MONITORING' },
  { id: 11, type: 'QUOTA_BREACH', severity: 'HIGH', message: 'Tilapia monthly quota at 92% with 8 days remaining — overfishing risk elevated', user: 'Quota Monitor', timestamp: new Date(Date.now() - 200 * 60000).toISOString(), status: 'ACTIVE' },
  { id: 12, type: 'SESSION_ANOMALY', severity: 'MEDIUM', message: 'Admin session active from 2 different geolocations within 5 minutes — possible credential sharing', user: 'Session Guard', timestamp: new Date(Date.now() - 240 * 60000).toISOString(), status: 'FLAGGED' },
];

const SEVERITY_STYLES = {
  CRITICAL: { dot: 'bg-red-500', text: 'text-red-500', badge: 'destructive' },
  HIGH: { dot: 'bg-orange-500', text: 'text-orange-500', badge: 'secondary' },
  MEDIUM: { dot: 'bg-yellow-500', text: 'text-yellow-500', badge: 'outline' },
  LOW: { dot: 'bg-blue-400', text: 'text-blue-400', badge: 'outline' },
  INFO: { dot: 'bg-slate-400', text: 'text-slate-400', badge: 'outline' },
};

const STATUS_STYLES = {
  ACTIVE: 'destructive',
  DETECTED: 'secondary',
  INVESTIGATING: 'secondary',
  MONITORING: 'outline',
  BLOCKED: 'destructive',
  MITIGATED: 'outline',
  FLAGGED: 'secondary',
  LOGGED: 'outline',
};

function formatTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function SecurityPage() {
  const [filter, setFilter] = useState('ALL');

  const filtered = useMemo(() => {
    if (filter === 'ALL') return DEMO_EVENTS;
    return DEMO_EVENTS.filter((e) => e.severity === filter);
  }, [filter]);

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    DEMO_EVENTS.forEach((e) => c[e.severity]++);
    return c;
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Security Operations Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time threat detection, anomaly monitoring, and security event log
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={ShieldAlert}
          label="Critical"
          value={counts.CRITICAL}
          variant="destructive"
          trend={100}
          trendLabel="new"
        />
        <KpiCard
          icon={AlertTriangle}
          label="High"
          value={counts.HIGH}
          variant="warning"
          trend={25}
        />
        <KpiCard
          icon={Eye}
          label="Medium"
          value={counts.MEDIUM}
          variant="info"
        />
        <KpiCard
          icon={Activity}
          label="Low / Info"
          value={counts.LOW + counts.INFO}
          variant="muted"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Resolved"
          value={2}
          variant="success"
          trend={-10}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Security Event Log
          </CardTitle>
          <div className="flex items-center gap-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <Button
                key={sev}
                variant={filter === sev ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setFilter(sev)}
              >
                {sev === 'ALL' ? 'All' : sev.charAt(0) + sev.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((event) => {
              const sev = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.INFO;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', sev.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px] py-0 font-mono', sev.text)}>
                        {event.type}
                      </Badge>
                      <Badge variant={STATUS_STYLES[event.status] || 'outline'} className="text-[10px] py-0">
                        {event.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                      {event.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Source: {event.user}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
