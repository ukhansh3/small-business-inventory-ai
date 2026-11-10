// R-08: 직선거리(하버사인)와 도보 시간(분당 67m, 시속 약 4km)

const EARTH_RADIUS_M = 6_371_000;
export const WALK_METERS_PER_MINUTE = 67;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function distanceDisplay(meters: number): { meters: number; display: string; walk_minutes: number } {
  const rounded = Math.round(meters / 10) * 10;
  const display = rounded < 1000 ? `${rounded}m` : `${(rounded / 1000).toFixed(1)}km`;
  const walk_minutes = Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE));
  return { meters: rounded, display, walk_minutes };
}
