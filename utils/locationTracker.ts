import * as Location from 'expo-location';
import { LocationObject, LocationSubscription } from 'expo-location';

class LocationTracker {
  private static instance: LocationTracker;
  private locationSubscription: LocationSubscription | null = null;
  private lastKnownLocation: LocationObject | null = null;
  private subscribers: Set<(location: LocationObject) => void> = new Set();

  private constructor() {}

  static getInstance(): LocationTracker {
    if (!LocationTracker.instance) {
      LocationTracker.instance = new LocationTracker();
    }
    return LocationTracker.instance;
  }

  async startTracking() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Enable high accuracy
      await Location.enableNetworkProviderAsync();

      // Start watching position with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000,   // Or every 5 seconds
        },
        (location) => {
          this.lastKnownLocation = location;
          this.notifySubscribers(location);
        }
      );

    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopTracking() {
    if (this.locationSubscription) {
      await this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }

  subscribe(callback: (location: LocationObject) => void) {
    this.subscribers.add(callback);
    if (this.lastKnownLocation) {
      callback(this.lastKnownLocation);
    }
  }

  unsubscribe(callback: (location: LocationObject) => void) {
    this.subscribers.delete(callback);
  }

  private notifySubscribers(location: LocationObject) {
    this.subscribers.forEach(callback => callback(location));
  }

  getLastKnownLocation(): LocationObject | null {
    return this.lastKnownLocation;
  }
}

export const locationTracker = LocationTracker.getInstance();