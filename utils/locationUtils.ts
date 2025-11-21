import streetData from "../app/data/street_google_data.json";

const data = streetData as any;

export type StreetEntry = {
  name: string;
  lat: number;
  lng: number;
  subarea: string;
};

let streetIndex: StreetEntry[] = [];

function preprocessStreetData() {
  if (streetIndex.length > 0) return;

  data.features.forEach((feature: any) => {
    const googleDetails = feature.google_details?.google_details;
    if (!googleDetails) return;

    googleDetails.forEach((addr: any) => {
      const location = addr.geometry?.location;
      if (!location) return; // skip if no geometry

      const street = addr.address_components?.find((c: any) =>
        c.types.includes("route")
      )?.long_name || "Unknown Street";

      const subarea = addr.address_components?.find((c: any) =>
        c.types.includes("sublocality_level_1")
      )?.long_name || "Unknown Subarea";

      streetIndex.push({
        name: street,
        lat: location.lat,
        lng: location.lng,
        subarea: subarea,
      });
    });
  });
}



function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ✅ Return typed as StreetEntry | null
export function getNearestStreet(lat: number, lng: number): StreetEntry | null {
  preprocessStreetData();

  let nearest: StreetEntry | null = null;
  let minDistance = Infinity;

  for (const entry of streetIndex) {
    const d = getDistance(lat, lng, entry.lat, entry.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = entry;
    }
  }

  return nearest;
}
