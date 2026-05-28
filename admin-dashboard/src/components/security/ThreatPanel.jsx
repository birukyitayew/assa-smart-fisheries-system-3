import { useState, useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Eye, Clock, Zap, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', label: 'Critical' },
  HIGH: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', label: 'High' },
  MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500', label: 'Medium' },
  LOW: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', dot: 'bg-blue-400', label: 'Low' },
};

const DEMO_THREATS = [
  {
    id: 't1',
    type: 'UNAUTHORIZED_ZONE_ENTRY',
    severity: 'CRITICAL',
    title: 'Unauthorized zone entry detected',
    description: 'Boat "Silver Fish" (BT-2023-004) entered Core Protected Area — breeding grounds. License FSH-2023-00089 is EXPIRED.',
    fisher: 'Hailu Desta',
    zone: 'Lake Tana – Core Protected Area',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    status: 'ACTIVE',
    aiSummary: 'An expired-license fisher entered a prohibited breeding zone. This represents a high-risk ecological threat as Core Protected Areas are critical spawning habitats. Immediate enforcement action recommended.',
    suggestedMitigation: 'Deploy nearest inspector to GPS coordinates. Issue zone violation notice. Consider temporary boat impoundment per fisheries regulation §4.2.',
  },
  {
    id: 't2',
    type: 'QUOTA_BREACH',
    severity: 'HIGH',
    title: 'Tilapia quota 92% reached — overfishing imminent',
    description: 'Monthly Tilapia quota at 92% utilization (4,600 of 5,000 kg). 8 days remaining in quota period. Historical pattern shows this leads to 120% breach.',
    fisher: null,
    zone: 'Lake Tana Region',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'ACTIVE',
    aiSummary: 'Tilapia quota consumption rate exceeds sustainable trajectory. At current rate (230kg/day), the limit will be breached in approximately 1.7 days. Last month saw a similar pattern resulting in 118% overshoot.',
    suggestedMitigation: 'Reduce daily catch limits for Tilapia by 40% for remaining period. Send SMS alerts to all Tilapia fishers. Consider temporary species-specific restriction in high-yield zones.',
  },
  {
    id: 't3',
    type: 'ANOMALOUS_CATCH',
    severity: 'HIGH',
    title: 'Anomalous catch volume detected',
    description: 'Fisher "Kebede Molla" submitted 280kg in single catch — 5.6x above personal daily average (50kg). Flagged by statistical anomaly detection.',
    fisher: 'Kebede Molla',
    zone: 'Lake Tana – West Zone (Mecha)',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'INVESTIGATING',
    aiSummary: 'Catch volume is 5.6 standard deviations above this fisher\'s 30-day rolling average. This could indicate unreported crew assistance, equipment violations, or catch data entry error. The West Zone (Mecha) has RESTRICTED status, making this especially concerning.',
    suggestedMitigation: 'Hold catch verification pending inspector review. Cross-reference GPS coordinates with fleet tracking data. Verify boat capacity (250kg for Tana Pride) against reported catch.',
  },
  {
    id: 't4',
    type: 'FLEET_ANOMALY',
    severity: 'MEDIUM',
    title: 'GPS signal lost — 3 boats in North Zone',
    description: 'Boats "Blue Star", "Blue Nile", "Morning Light" GPS signals dropped simultaneously at 14:23. Possible equipment tampering or signal jamming.',
    fisher: null,
    zone: 'Lake Tana – North Zone (Gorgora)',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: 'MONITORING',
    aiSummary: 'Simultaneous GPS loss on 3 boats in the same zone is statistically unlikely to be coincidental (p < 0.003). Pattern matches known GPS tampering behavior observed in other fisheries. However, atmospheric interference or equipment failure cannot be ruled out.',
    suggestedMitigation: 'Dispatch patrol boat to last known coordinates. Cross-reference with catch submissions during signal gap. Add boats to enhanced monitoring list for 30 days.',
  },
  {
    id: 't5',
    type: 'MARKET_FRAUD',
    severity: 'MEDIUM',
    title: 'Suspected price manipulation detected',
    description: 'Nile Perch listings showing 45% price increase in 48h with no supply shortage. 3 sellers from same zone listing at identical inflated prices.',
    fisher: null,
    zone: 'Market — Bahir Dar',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: 'INVESTIGATING',
    aiSummary: 'Price coordination pattern detected: 3 sellers in Bahir Dar zone listed Nile Perch at ETB 420/kg simultaneously, a 45% premium over the 7-day average (ETB 290/kg). Supply levels remain normal. This matches price-fixing behavior patterns.',
    suggestedMitigation: 'Flag listings for manual price review. Notify market oversight team. Compare with historical pricing data for seasonal adjustments. Consider temporary price cap per regulation §7.1.',
  },
  {
    id: 't6',
    type: 'COMPLIANCE_DECAY',
    severity: 'LOW',
    title: 'Compliance score degradation trend',
    description: '4 fishers dropped below 70 compliance score this week (vs. 1 avg). Possible enforcement gap in East Zone.',
    fisher: null,
    zone: 'Lake Tana – East Zone (Woreta)',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    status: 'MONITORING',
    aiSummary: 'East Zone compliance scores declining 4x faster than regional average. Common factors: 3 of 4 fishers received no inspections in 60+ days. Correlation with reduced inspector presence in zone (1 inspector reassigned to North Zone in April).',
    suggestedMitigation: 'Rebalance inspector assignments to restore East Zone coverage. Schedule targeted compliance reviews for affected fishers. Consider incentive program for consistent compliance maintainers.',
  },
];

function ThreatRow({ threat, onSelect, isSelected }) {
  const sev = SEVERITY_CONFIG[threat.severity];
  const timeAgo = getTimeAgo(threat.timestamp);

  return (
    <button
      type="button"
      onClick={() => onSelect(threat)}
      className={cn(
        'w-full text-left p-3 border-b border-border transition-all duration-150',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/5 border-l-2 border-l-primary',
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', sev.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{threat.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn('text-[10px] py-0', sev.color, sev.border)}>
              {sev.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
            {threat.status === 'ACTIVE' && (
              <Badge variant="destructive" className="text-[10px] py-0 animate-pulse">ACTIVE</Badge>
            )}
            {threat.status === 'INVESTIGATING' && (
              <Badge variant="secondary" className="text-[10px] py-0">INVESTIGATING</Badge>
            )}
            {threat.status === 'MONITORING' && (
              <Badge variant="outline" className="text-[10px] py-0">MONITORING</Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function ThreatDetail({ threat }) {
  const sev = SEVERITY_CONFIG[threat.severity];
  const [showAi, setShowAi] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', sev.bg)}>
          <ShieldAlert className={cn('h-5 w-5', sev.color)} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{threat.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn('text-xs', sev.color, sev.border)}>
              {sev.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{threat.type.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{threat.description}</p>

      {threat.fisher && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Fisher: <span className="text-foreground font-medium">{threat.fisher}</span></span>
          <span>Zone: <span className="text-foreground font-medium">{threat.zone}</span></span>
        </div>
      )}
      {!threat.fisher && threat.zone && (
        <div className="text-xs text-muted-foreground">
          Zone: <span className="text-foreground font-medium">{threat.zone}</span>
        </div>
      )}

      <div className="pt-2 space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAi(!showAi)}
          className="gap-2"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          {showAi ? 'Hide AI Analysis' : 'AI Threat Analysis'}
        </Button>

        {showAi && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">AI THREAT SUMMARY</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{threat.aiSummary}</p>
            </div>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">SUGGESTED MITIGATION</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{threat.suggestedMitigation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ThreatPanel() {
  const [selectedId, setSelectedId] = useState(DEMO_THREATS[0]?.id);
  const selected = DEMO_THREATS.find((t) => t.id === selectedId);

  const stats = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    DEMO_THREATS.forEach((t) => { counts[t.severity]++; });
    return counts;
  }, []);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Threat Center
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {stats.CRITICAL > 0 && (
              <Badge variant="destructive" className="text-[10px] py-0 animate-pulse">
                {stats.CRITICAL} Critical
              </Badge>
            )}
            {stats.HIGH > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 text-orange-500 border-orange-500/30">
                {stats.HIGH} High
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] py-0">
              {DEMO_THREATS.length} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 border-t border-border">
          <div className="lg:col-span-2 border-r border-border max-h-[420px] overflow-y-auto">
            {DEMO_THREATS.map((threat) => (
              <ThreatRow
                key={threat.id}
                threat={threat}
                isSelected={selectedId === threat.id}
                onSelect={(t) => setSelectedId(t.id)}
              />
            ))}
          </div>
          <div className="lg:col-span-3 p-4">
            {selected ? (
              <ThreatDetail threat={selected} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Info className="h-8 w-8 mb-2" />
                <p className="text-sm">Select a threat to view details</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
