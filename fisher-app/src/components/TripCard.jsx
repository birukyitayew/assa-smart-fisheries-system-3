import { useState } from 'react'
import { Anchor, Play, Square } from 'lucide-react'
import api from '../services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatElapsed(startedAt) {
  if (!startedAt) return '—'
  const start = new Date(startedAt.replace(' ', 'T'))
  const mins = Math.floor((Date.now() - start.getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return `${h}h ${mins % 60}m`
}

export default function TripCard({ profile, activeTrip, onTripChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const canStart =
    profile?.license_status === 'VALID' && profile?.boat_name && !activeTrip

  async function startTrip() {
    setLoading(true)
    setError(null)
    try {
      await api.post('/fisher/trips/start')
      onTripChange?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start trip')
    } finally {
      setLoading(false)
    }
  }

  async function endTrip() {
    setLoading(true)
    setError(null)
    try {
      await api.post('/fisher/trips/end')
      onTripChange?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not end trip')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={activeTrip ? 'border-primary/30 bg-primary/5' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Anchor className="h-4 w-4 text-primary" />
          Fishing trip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeTrip ? (
          <>
            <div className="flex items-center justify-between">
              <Badge>Active</Badge>
              <span className="text-sm text-muted-foreground">
                {formatElapsed(activeTrip.started_at)} elapsed
              </span>
            </div>
            <p className="text-sm text-foreground">
              {activeTrip.boat_name || profile?.boat_name} — GPS tracking on
            </p>
            <Button className="w-full" variant="destructive" onClick={endTrip} disabled={loading}>
              <Square className="h-4 w-4 mr-2" />
              End trip
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Start a trip before fishing so fleet ops can track your boat on the lake map.
            </p>
            {!profile?.boat_name && (
              <p className="text-xs text-warning">Register a boat with fisheries office first.</p>
            )}
            {profile?.license_status !== 'VALID' && (
              <p className="text-xs text-destructive">Valid license required to start a trip.</p>
            )}
            <Button className="w-full" onClick={startTrip} disabled={!canStart || loading}>
              <Play className="h-4 w-4 mr-2" />
              Start fishing trip
            </Button>
          </>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
