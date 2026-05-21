import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

export default function Step2Location({
  form,
  zones,
  errors,
  onZoneSelect,
  onCaptureGps,
  gpsLoading,
  gpsError,
}) {
  const selectedZone = zones.find((z) => z.id === Number(form.zone_id))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fishing Zone *</Label>
        <Select value={form.zone_id ? String(form.zone_id) : ''} onValueChange={onZoneSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select zone..." />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={String(z.id)}>
                {z.name} ({z.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.zone_id && <p className="text-destructive text-xs">{errors.zone_id}</p>}
      </div>

      {selectedZone && (
        <Card
          className={cn(
            selectedZone.type === 'ALLOWED' && 'border-success bg-success-muted',
            selectedZone.type === 'RESTRICTED' && 'border-warning bg-warning-muted',
            selectedZone.type === 'PROHIBITED' && 'border-destructive/30 bg-destructive/5',
          )}
        >
          <CardContent className="pt-4 text-sm">
            {selectedZone.type === 'ALLOWED' && 'Allowed zone — catches accepted normally.'}
            {selectedZone.type === 'RESTRICTED' &&
              'Restricted zone — your catch will be flagged for closer review.'}
            {selectedZone.type === 'PROHIBITED' &&
              'Prohibited zone — fishing is not allowed here. Your catch will be flagged.'}
            <p className="text-xs mt-1 text-muted-foreground">{selectedZone.description}</p>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onCaptureGps}
        disabled={gpsLoading}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {gpsLoading ? 'Getting GPS…' : 'Refresh device GPS'}
      </Button>
      {gpsError && <p className="text-xs text-warning">{gpsError}</p>}

      {form.gps_lat && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Device GPS (submitted with catch)</div>
            <div className="font-mono text-sm">
              {Number(form.gps_lat).toFixed(4)}° N, {Number(form.gps_lng).toFixed(4)}° E
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
