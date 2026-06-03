import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap } from 'react-leaflet';
import api from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, Compass } from 'lucide-react';
import MapResizeFix from '../components/MapResizeFix';

const TYPE_VARIANT = {
  ALLOWED: 'default',
  RESTRICTED: 'secondary',
  PROHIBITED: 'destructive',
};

const zoneColors = {
  ALLOWED: { fill: '#22c55e', stroke: '#16a34a' },
  RESTRICTED: { fill: '#f59e0b', stroke: '#d97706' },
  PROHIBITED: { fill: '#ef4444', stroke: '#dc2626' },
};

// Lake Tana Viewport
const LAKE_TANA_CENTER = [11.75, 37.35];
const LAKE_TANA_BOUNDS = [
  [11.32, 36.82],
  [12.22, 37.88],
];

// Inner controller component to handle map pan/fly animations cleanly in React-Leaflet
function MapController({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget.coords, flyTarget.zoom || 12, { animate: true, duration: 1.5 });
    }
  }, [flyTarget, map]);
  return null;
}

function parsePolygon(zone) {
  if (!zone.geoPolygon && !zone.geo_polygon) return null;
  try {
    const poly = zone.geoPolygon || zone.geo_polygon;
    const raw = typeof poly === 'string' ? JSON.parse(poly) : poly;
    if (!Array.isArray(raw) || raw.length < 3) return null;
    return raw.map(([lat, lng]) => [lat, lng]);
  } catch {
    return null;
  }
}

export default function FishingZonesPage() {
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    api.get('/zones').then((res) => setZones(res.data.zones));
  }, []);

  const handleFocusZone = (z) => {
    setSelectedZoneId(z.id);
    if (z.gps_lat && z.gps_lng) {
      setFlyTarget({
        coords: [z.gps_lat, z.gps_lng],
        zoom: 12,
      });
      // Scroll smoothly to map container on small mobile screens
      document
        .getElementById('mobile-leaflet-map')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fishing Zones</h2>
        <p className="text-sm text-muted-foreground">Lake Tana, Amhara Region</p>
      </div>

      {/* Interactive Map Container */}
      <div
        id="mobile-leaflet-map"
        className="w-full h-[280px] rounded-lg overflow-hidden border border-border shadow-inner z-0"
      >
        <MapContainer
          center={LAKE_TANA_CENTER}
          zoom={10}
          minZoom={9}
          maxZoom={13}
          maxBounds={LAKE_TANA_BOUNDS}
          maxBoundsViscosity={1}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <MapResizeFix />
          <MapController flyTarget={flyTarget} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {zones.map((z) => {
            const polygonCoords = parsePolygon(z);
            const styleColors = zoneColors[z.type] || { fill: '#888', stroke: '#888' };

            if (polygonCoords) {
              return (
                <Polygon
                  key={`map-zone-poly-${z.id}`}
                  positions={polygonCoords}
                  pathOptions={{
                    color: styleColors.stroke,
                    fillColor: styleColors.fill,
                    fillOpacity: selectedZoneId === z.id ? 0.35 : 0.15,
                    weight: selectedZoneId === z.id ? 4 : 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedZoneId(z.id),
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong className="block text-sm">{z.name}</strong>
                      <span className="text-muted-foreground block mb-1">{z.description}</span>
                      <Badge variant={TYPE_VARIANT[z.type]}>{z.type}</Badge>
                    </div>
                  </Popup>
                </Polygon>
              );
            }

            return z.gps_lat ? (
              <Circle
                key={`map-zone-circle-${z.id}`}
                center={[z.gps_lat, z.gps_lng]}
                radius={2000}
                pathOptions={{
                  color: styleColors.stroke,
                  fillColor: styleColors.fill,
                  fillOpacity: selectedZoneId === z.id ? 0.35 : 0.15,
                  weight: selectedZoneId === z.id ? 4 : 2,
                }}
                eventHandlers={{
                  click: () => setSelectedZoneId(z.id),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="block text-sm">{z.name}</strong>
                    <span className="text-muted-foreground block mb-1">{z.description}</span>
                    <Badge variant={TYPE_VARIANT[z.type]}>{z.type}</Badge>
                  </div>
                </Popup>
              </Circle>
            ) : null;
          })}
        </MapContainer>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-4 text-xs flex-wrap justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            {['ALLOWED', 'RESTRICTED', 'PROHIBITED'].map((type) => (
              <Badge key={type} variant={TYPE_VARIANT[type]}>
                {type}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Compass className="h-3 w-3 animate-spin-slow" /> Tap a zone card to locate
          </span>
        </CardContent>
      </Card>

      {/* Regulation Cards List */}
      <div className="space-y-3">
        {zones.map((z) => (
          <Card
            key={z.id}
            className={cn(
              'transition-all duration-300 active:scale-[0.99] cursor-pointer',
              z.type === 'PROHIBITED' && 'border-destructive/20 hover:border-destructive/40',
              z.type === 'RESTRICTED' && 'border-warning/20 hover:border-warning/40',
              selectedZoneId === z.id &&
                'ring-2 ring-primary border-primary/45 shadow-md bg-accent/30',
            )}
            onClick={() => handleFocusZone(z)}
          >
            <CardContent className="pt-6 flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  {z.name}
                  {selectedZoneId === z.id && (
                    <MapPin className="h-3.5 w-3.5 text-primary animate-bounce" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{z.description}</p>
                <div className="text-xs text-muted-foreground/80 flex items-center gap-1 pt-1">
                  <span>
                    {z.gps_lat?.toFixed(4)}° N, {z.gps_lng?.toFixed(4)}° E
                  </span>
                  <span>•</span>
                  <span className="text-primary font-medium hover:underline flex items-center gap-0.5">
                    Locate on map
                  </span>
                </div>
              </div>
              <Badge
                variant={TYPE_VARIANT[z.type] || 'outline'}
                className="flex-shrink-0 uppercase text-xs"
              >
                {z.type}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
