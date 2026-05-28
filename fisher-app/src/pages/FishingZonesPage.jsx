import { useState, useEffect } from 'react';
import api from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TYPE_VARIANT = {
  ALLOWED: 'default',
  RESTRICTED: 'secondary',
  PROHIBITED: 'destructive',
};

export default function FishingZonesPage() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    api.get('/zones').then((res) => setZones(res.data.zones));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fishing Zones</h2>
        <p className="text-sm text-muted-foreground">Lake Tana, Amhara Region</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-4 text-xs flex-wrap">
          {['ALLOWED', 'RESTRICTED', 'PROHIBITED'].map((type) => (
            <Badge key={type} variant={TYPE_VARIANT[type]}>
              {type}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {zones.map((z) => (
          <Card
            key={z.id}
            className={cn(
              z.type === 'PROHIBITED' && 'border-destructive/30',
              z.type === 'RESTRICTED' && 'border-orange-500/30',
            )}
          >
            <CardContent className="pt-6 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground text-sm">{z.name}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{z.description}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {z.gps_lat?.toFixed(4)}° N, {z.gps_lng?.toFixed(4)}° E
                </div>
              </div>
              <Badge variant={TYPE_VARIANT[z.type] || 'outline'} className="flex-shrink-0">
                {z.type}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
