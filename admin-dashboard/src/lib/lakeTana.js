/** Lake Tana viewport — keeps the command map focused on the lake, not all of Ethiopia. */
export const LAKE_TANA_CENTER = { lat: 11.75, lng: 37.35, zoom: 11 };

/** Southwest and northeast corners for Leaflet maxBounds. */
export const LAKE_TANA_BOUNDS = [
  [11.32, 36.82],
  [12.22, 37.88],
];

export const LAKE_TANA_MIN_ZOOM = 9;
export const LAKE_TANA_MAX_ZOOM = 14;

export function lakeTanaMapCenter(region) {
  if (region?.centerLat != null && region?.centerLng != null) {
    return {
      lat: region.centerLat,
      lng: region.centerLng,
      zoom: 11,
    };
  }
  return { ...LAKE_TANA_CENTER };
}
