import { useState, useEffect } from 'react'
import api from '../services/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const TYPE_VARIANT = {
  ALLOWED: 'default',
  RESTRICTED: 'secondary',
  PROHIBITED: 'destructive',
}

export default function ZonesPage() {
  const [zones, setZones] = useState([])
  const [rules, setRules] = useState([])

  useEffect(() => {
    api.get('/admin/zones').then((res) => setZones(res.data.zones))
    api.get('/admin/season-rules').then((res) => setRules(res.data.rules || []))
  }, [])

  const rulesByZone = rules.reduce((acc, r) => {
    if (!acc[r.zone_id]) acc[r.zone_id] = []
    acc[r.zone_id].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fishing Zones</h2>
        <p className="text-sm text-muted-foreground">Lake Tana, Amhara Region — Zone status and activity</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-6 text-sm flex-wrap">
          {['ALLOWED', 'RESTRICTED', 'PROHIBITED'].map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Badge variant={TYPE_VARIANT[type]}>{type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {zones.map((z) => (
          <Card
            key={z.id}
            className={cn(
              z.type === 'PROHIBITED' && 'border-destructive/30',
              z.type === 'RESTRICTED' && 'border-warning/30',
            )}
          >
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <div className="font-semibold text-foreground">{z.name}</div>
                <p className="text-sm text-muted-foreground mt-1">{z.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>
                    {z.gps_lat?.toFixed(4)}° N, {z.gps_lng?.toFixed(4)}° E
                  </span>
                  <span>
                    Today: {z.today_submissions} submission{z.today_submissions !== 1 ? 's' : ''}
                  </span>
                  {z.geo_polygon && <span className="text-success">GeoJSON boundary</span>}
                </div>
                {rulesByZone[z.id]?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {rulesByZone[z.id].map((r) => (
                      <li key={r.id} className="text-xs text-muted-foreground">
                        {r.species}: {r.rule_type} ({r.season_start} – {r.season_end})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Badge variant={TYPE_VARIANT[z.type] || 'outline'}>{z.type}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
