import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Polygon, Polyline } from 'react-leaflet'

const LAKE_CENTER = [11.75, 37.35]
const ZONE_RADIUS = 2000

const zoneColors = {
  ALLOWED: { fill: '#22c55e', stroke: '#16a34a' },
  RESTRICTED: { fill: '#f59e0b', stroke: '#d97706' },
  PROHIBITED: { fill: '#ef4444', stroke: '#dc2626' },
}

const boatColors = {
  FISHING: '#3b82f6',
  RETURNING: '#8b5cf6',
  DOCKED: '#6b7280',
  OFFLINE: '#374151',
}

function parsePolygon(zone) {
  if (!zone.geo_polygon) return null
  try {
    const raw = typeof zone.geo_polygon === 'string' ? JSON.parse(zone.geo_polygon) : zone.geo_polygon
    if (!Array.isArray(raw) || raw.length < 3) return null
    return raw.map(([lat, lng]) => [lat, lng])
  } catch {
    return null
  }
}

export default function CommandMap({
  layers,
  height = '480px',
  route = [],
  highlightBoatId = null,
  mapKey = 'default',
}) {
  useEffect(() => {
    document.getElementById('command-map')?.scrollIntoView({ block: 'nearest' })
  }, [])

  const zones = layers?.zones || []
  const fleet = layers?.fleet || []
  const catches = layers?.catches || []
  const routePositions = route.filter((p) => p.lat != null && p.lng != null).map((p) => [p.lat, p.lng])

  return (
    <div id="command-map" style={{ height }} className="rounded-lg overflow-hidden border border-border z-0">
      <MapContainer
        key={mapKey}
        center={LAKE_CENTER}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {zones.map((z) => {
          const ring = parsePolygon(z)
          if (ring) {
            return (
              <Polygon
                key={`zone-poly-${z.id}`}
                positions={ring}
                pathOptions={{
                  color: zoneColors[z.type]?.stroke || '#888',
                  fillColor: zoneColors[z.type]?.fill || '#888',
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{z.name}</strong>
                  <br />
                  <span className="text-xs">{z.type}</span>
                </Popup>
              </Polygon>
            )
          }
          return z.gps_lat ? (
            <Circle
              key={`zone-${z.id}`}
              center={[z.gps_lat, z.gps_lng]}
              radius={ZONE_RADIUS}
              pathOptions={{
                color: zoneColors[z.type]?.stroke || '#888',
                fillColor: zoneColors[z.type]?.fill || '#888',
                fillOpacity: 0.15,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{z.name}</strong>
                <br />
                <span className="text-xs">{z.type}</span>
              </Popup>
            </Circle>
          ) : null
        })}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
          />
        )}

        {fleet.map((b) =>
          b.lat ? (
            <CircleMarker
              key={`boat-${b.boat_id}`}
              center={[b.lat, b.lng]}
              radius={highlightBoatId === b.boat_id ? 11 : 8}
              pathOptions={{
                color: highlightBoatId === b.boat_id ? '#1d4ed8' : '#fff',
                fillColor: boatColors[b.status] || '#3b82f6',
                fillOpacity: 0.9,
                weight: highlightBoatId === b.boat_id ? 3 : 2,
              }}
            >
              <Popup>
                <strong>{b.boat_name}</strong>
                <br />
                {b.fisher_name}
                <br />
                <span className="text-xs">Status: {b.status || b.position_status || 'UNKNOWN'}</span>
              </Popup>
            </CircleMarker>
          ) : null,
        )}

        {catches.map((c) =>
          c.gps_lat ? (
            <CircleMarker
              key={`catch-${c.id}`}
              center={[c.gps_lat, c.gps_lng]}
              radius={5}
              pathOptions={{
                color: c.status === 'PENDING' ? '#f59e0b' : '#22c55e',
                fillColor: c.status === 'PENDING' ? '#f59e0b' : '#22c55e',
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                <strong>{c.reference_id}</strong>
                <br />
                {c.fisher_name} — {c.species} {c.quantity_kg}kg
              </Popup>
            </CircleMarker>
          ) : null,
        )}
      </MapContainer>
    </div>
  )
}
