import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_LEVELS = [
  { min: 0, max: 30, label: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500', icon: ShieldCheck },
  { min: 31, max: 60, label: 'MODERATE', color: 'text-yellow-500', bg: 'bg-yellow-500', icon: Shield },
  { min: 61, max: 80, label: 'ELEVATED', color: 'text-orange-500', bg: 'bg-orange-500', icon: ShieldAlert },
  { min: 81, max: 100, label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500', icon: ShieldAlert },
];

export default function RiskScore({ score = 67 }) {
  const level = RISK_LEVELS.find((l) => score >= l.min && score <= l.max) || RISK_LEVELS[0];
  const Icon = level.icon;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border text-xs">
      <Icon className={cn('h-3.5 w-3.5', level.color)} />
      <span className="hidden sm:inline text-muted-foreground">Risk:</span>
      <span className={cn('font-semibold', level.color)}>{level.label}</span>
      <span className={cn('font-mono text-[10px] px-1 py-0.5 rounded', level.color, `${level.bg}/10`)}>
        {score}
      </span>
    </div>
  );
}
