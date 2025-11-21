import Constants from 'expo-constants';

const LOCATIONIQ_API_KEY = Constants.expoConfig?.extra?.LOCATIONIQ_API_KEY;

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(address)}&format=json`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Geocoding failed');
    }
    
    return data[0];
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Reverse geocoding failed');
    }
    
    return data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};