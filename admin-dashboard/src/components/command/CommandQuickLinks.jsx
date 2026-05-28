import { Link } from 'react-router-dom';
import { Ship, Brain, MapPin, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const links = [
  { to: '/fleet', label: 'Fleet', icon: Ship, description: 'Boats & routes' },
  { to: '/intelligence', label: 'Intelligence', icon: Brain, description: 'Prices & shortages' },
  { to: '/map', label: 'Lake Map', icon: MapPin, description: 'Zones & positions' },
  { to: '/market', label: 'Market', icon: TrendingUp, description: 'Buyers & sellers' },
  { to: '/live', label: 'Live Ops', icon: Activity, description: 'Pending & orders' },
];

export default function CommandQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => (
        <Button key={item.to} variant="outline" size="sm" asChild className="h-auto py-2 px-3">
          <Link to={item.to}>
            <item.icon className="h-4 w-4 mr-2 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="font-medium">{item.label}</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {item.description}
              </span>
            </span>
          </Link>
        </Button>
      ))}
    </div>
  );
}
