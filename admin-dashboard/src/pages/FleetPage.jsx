import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Ship, MapPin } from 'lucide-react'
import api from '../services/api'
import { useRegion } from '../context/RegionContext'
import { usePolling } from '../hooks/usePolling'
import PageHeader from '../components/layout/PageHeader'
import CommandMap from '../components/command/CommandMap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function statusChip(boat) {
  if (boat.trip_status === 'ACTIVE') return { label: 'On trip', variant: 'default' }
  const s = boat.position_status || 'OFFLINE'
  if (s === 'FISHING') return { label: 'Fishing', variant: 'default' }
  if (s === 'RETURNING') return { label: 'Returning', variant: 'secondary' }
  if (s === 'DOCKED') return { label: 'Docked', variant: 'outline' }
  return { label: s, variant: 'outline' }
}

export default function FleetPage() {
  const { selectedRegionId, mapCenter } = useRegion()
  const [boats, setBoats] = useState([])
  const [layers, setLayers] = useState({ zones: [], fleet: [], catches: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [route, setRoute] = useState([])
  const [loadError, setLoadError] = useState(null)
  const didAutoSelect = useRef(false)

  const fetchFleet = useCallback(async () => {
    try {
      setLoadError(null)
      const [fleetRes, mapRes] = await Promise.all([
        api.get('/admin/fleet'),
        api.get('/admin/map/layers'),
      ])
      const boatList = fleetRes.data.boats || []
      setBoats(boatList)
      const fleet = boatList.map((b) => ({
        ...b,
        status: b.position_status || b.status,
      }))
      setLayers({
        zones: mapRes.data.zones || [],
        fleet,
        catches: [],
      })
      if (!didAutoSelect.current && boatList.length > 0) {
        didAutoSelect.current = true
        const firstId = boatList[0].boat_id
        setSelectedId(firstId)
        const hist = await api.get(`/admin/fleet/${firstId}/history?hours=24`)
        setRoute(hist.data.points || [])
      }
    } catch (err) {
      console.error('Fleet fetch error:', err)
      const msg = err.response?.data?.error || err.message || 'Failed to load fleet'
      setLoadError(msg)
    }
  }, [selectedRegionId])

  const loadHistory = useCallback(async (boatId) => {
    if (!boatId) {
      setRoute([])
      return
    }
    try {
      const res = await api.get(`/admin/fleet/${boatId}/history?hours=24`)
      setRoute(res.data.points || [])
    } catch (err) {
      console.error('Fleet history error:', err)
      setRoute([])
    }
  }, [])

  usePolling(fetchFleet, 15000)

  const selectBoat = (boatId) => {
    setSelectedId(boatId)
    loadHistory(boatId)
  }

  const selected = boats.find((b) => b.boat_id === selectedId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Operations"
        description="Registered boats, active trips, and 24h route history (GC-05)"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/map">
              <MapPin className="h-4 w-4 mr-2" />
              Full command map
            </Link>
          </Button>
        }
      />

      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load fleet data: {loadError}. Restart the backend after pulling Phase 3 changes (
            <code className="text-xs">npm run dev --prefix backend</code>
            ).
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Boats ({boats.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto p-0 pt-0">
            {boats.length === 0 && !loadError && (
              <p className="px-4 py-6 text-sm text-muted-foreground">No boats registered yet.</p>
            )}
            {boats.map((b) => {
              const chip = statusChip(b)
              const isSelected = selectedId === b.boat_id
              return (
                <button
                  key={b.boat_id}
                  type="button"
                  onClick={() => selectBoat(b.boat_id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border transition-colors',
                    isSelected && 'bg-primary/5 border-l-2 border-l-primary',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{b.boat_name}</div>
                      <div className="text-xs text-muted-foreground">{b.fisher_name}</div>
                    </div>
                    <Badge variant={chip.variant} className="text-[10px] shrink-0">
                      {chip.label}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {b.recorded_at
                      ? `Last ping ${new Date(b.recorded_at).toLocaleString('en-ET', { hour: '2-digit', minute: '2-digit' })}`
                      : 'No GPS yet'}
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selected
                ? `Route — ${selected.boat_name} (${route.length} points)`
                : 'Select a boat to view route history'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommandMap
              layers={layers}
              route={route}
              highlightBoatId={selectedId}
              mapKey={`fleet-${selectedRegionId}-${selectedId}-${route.length}`}
              center={mapCenter}
              zoom={mapCenter.zoom}
              height="520px"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
