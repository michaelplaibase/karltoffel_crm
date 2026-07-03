// Lightweight geo helper for the planner. In production this would call a geocoding
// + routing API; here we use approximate coordinates per service area and a
// straight-line driving-time estimate — deterministic, no external calls.

export type LatLng = [number, number];

const AREA_COORDS: Record<string, LatLng> = {
  "8660": [56.038, 9.927], // Skanderborg
  "8700": [55.861, 9.850], // Horsens
  "8000": [56.157, 10.203], // Aarhus C
  "8300": [55.974, 10.148], // Odder
  "8600": [56.139, 9.545], // Silkeborg
};

export const HOME: LatLng = [55.88, 9.83]; // employee home (Horsens area)

/** Resolve a coordinate from an address by its 4-digit postal code. */
export function coordFor(address: string): LatLng {
  const m = address.match(/\b(\d{4})\b/);
  if (m && AREA_COORDS[m[1]]) return AREA_COORDS[m[1]];
  return AREA_COORDS["8700"];
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated driving time in minutes between two addresses. */
export function driveMinutes(fromAddr: string, toAddr: string): number {
  const km = haversineKm(coordFor(fromAddr), coordFor(toAddr));
  return Math.round(km * 1.15 + (km > 0.5 ? 4 : 0)); // ~52 km/h + fixed egress
}

/** Driving minutes from the employee home to an address. */
export function driveFromHomeMinutes(toAddr: string, home: LatLng = HOME): number {
  const key = Object.entries(AREA_COORDS).find(([, c]) => c === coordFor(toAddr));
  const km = haversineKm(home, key ? coordFor(toAddr) : HOME);
  return Math.round(km * 1.15 + 4);
}
