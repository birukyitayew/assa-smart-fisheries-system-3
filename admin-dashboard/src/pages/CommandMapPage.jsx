import { useState, useCallback } from 'react'
import api from '../services/api'
import { usePolling } from '../hooks/usePolling'
import CommandMap from '../components/command/CommandMap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const zoneLegend = [
  { type: 'ALLOWED', color: 'bg-success' },
  { type: 'RESTRICTED', color: 'bg-warning' },
  { type: 'PROHIBITED', color: 'bg-red-500' },
]

const boatLegend = [
  { status: 'FISHING', color: 'bg-blue-500' },
  { status: 'RETURNING', color: 'bg-violet-500' },
  { status: 'DOCKED', color: 'bg-gray-500' },
]

export default function CommandMapPage() {
  const [layers, setLayers] = useState({ zones: [], fleet: [], catches: [] })

  const fetchLayers = useCallback(async () => {
    try {
      const res = await api.get('/admin/map/layers')
      setLayers(res.data)
    } catch (err) {
      console.error('Map layers error:', err)
    }
  }, [])

  usePolling(fetchLayers, 10000)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Lake Command Map</h2>
        <p className="text-sm text-muted-foreground">
          Fishing zones, fleet positions, and catch pins (last 24h)
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {zoneLegend.map((z) => (
          <div key={z.type} className="flex items-center gap-2 text-xs">
            <span className={`w-3 h-3 rounded-full ${z.color}`} />
            {z.type} zones
          </div>
        ))}
        <span className="text-muted-foreground">|</span>
        {boatLegend.map((b) => (
          <div key={b.status} className="flex items-center gap-2 text-xs">
            <span className={`w-3 h-3 rounded-full ${b.color}`} />
            {b.status}
          </div>
        ))}
        <span className="text-muted-foreground">|</span>
        <Badge variant="outline" className="text-xs">
          {layers.fleet?.length || 0} boats · {layers.catches?.length || 0} catches
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lake Tana — Live Layers</CardTitle>
        </CardHeader>
        <CardContent>
          <CommandMap layers={layers} height="560px" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Zones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {layers.zones?.map((z) => (
              <div key={z.id} className="text-xs flex justify-between gap-2">
                <span className="truncate">{z.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {z.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fleet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {layers.fleet?.map((b) => (
              <div key={b.boat_id} className="text-xs">
                <span className="font-medium">{b.boat_name}</span>
                <span className="text-muted-foreground"> — {b.fisher_name}</span>
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {b.status || '—'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Catches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {layers.catches?.slice(0, 12).map((c) => (
              <div key={c.id} className="text-xs">
                {c.reference_id} — {c.species} ({c.status})
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
