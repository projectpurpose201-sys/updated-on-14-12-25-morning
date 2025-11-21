// utils/geoUtils.ts

import polygonsJson from "../app/data/all_subareas_updated.json";

export type PolygonData = {
  [key: string]: { lat: number; lng: number }[];
};

export const polygons: PolygonData = polygonsJson;
/**
 * Ray-casting algorithm to check if a point is inside a polygon.
 */
/**
 * Get the centroid of a polygon (average of vertices)
 */

export function getPolygonCenter(polygon: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const n = polygon.length;
  let sumLat = 0;
  let sumLng = 0;

  polygon.forEach((p) => {
    sumLat += p.lat;
    sumLng += p.lng;
  });

  return { lat: sumLat / n, lng: sumLng / n };
}


export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Get the area name for a given lat/lng coordinate.
 * Returns null if the point doesn't belong to any polygon.
 */
export function getAreaName(point: { lat: number; lng: number }): string | null {
  for (const [name, polygon] of Object.entries(polygons)) {
    if (isPointInPolygon(point, polygon)) {
      return name;
    }
  }
  return null;
}
