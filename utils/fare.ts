// utils/fareCalculations.ts

/**
 * Calculate fare based on distance
 * Base fare: ₹40 for <1 km
 * 1 km: ₹50  
 * Each additional km: ₹10
 * Rounded to nearest: ₹10
 */
export const calculateFare = (distance: number): number => {
  if (distance < 1) return 40;
  if (distance === 1) return 50;
  return 50 + Math.ceil(distance - 1) * 10;
};

/**
 * Calculate distance from fare (reverse calculation)
 * Useful when you have fare but need estimated distance
 */
export const calculateDistanceFromFare = (fare: number): number => {
  const roundedFare = roundFareToNearest10(fare);
  
  // Base cases
  if (roundedFare <= 40) return 0.8; // Average for <1 km range
  if (roundedFare === 50) return 1;
  
  // For fares above 50: fare = 50 + (distance - 1) * 10
  // So: distance = 1 + (fare - 50) / 10
  const distance = 1 + (roundedFare - 50) / 10;
  return distance;
};

/**
 * Round fare to nearest 10 rupees
 */
export const roundFareToNearest10 = (fare: number): number => {
  return Math.round(fare / 10) * 10;
};

/**
 * Calculate actual geographical distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate fare with rounding applied
 */
export const calculateRoundedFare = (distance: number): number => {
  const rawFare = calculateFare(distance);
  return roundFareToNearest10(rawFare);
};

/**
 * Generate fare breakdown for display
 */
export const getFareBreakdown = (distance: number) => {
  const baseFare = distance < 1 ? 40 : 50;
  const additionalKm = distance <= 1 ? 0 : Math.ceil(distance - 1);
  const additionalFare = additionalKm * 10;
  const totalFare = baseFare + additionalFare;
  const roundedFare = roundFareToNearest10(totalFare);
  
  return {
    baseFare,
    additionalKm,
    additionalFare,
    totalFare,
    roundedFare
  };
};
