import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from "react-native";
import RideReviewModal from "../../components/RideReviewModal";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { theme } from "../../utils/theme";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

interface RideData {
  id: string;
  status: string;
  driver_id: string;
  passenger_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  otp: string | null;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface DriverLocationPayload {
  new: {
    lat: string;
    lng: string;
    driver_id: string;
  };
}

export default function RideTracking() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string }>();
  const rideId = params?.rideId;
  
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [routeCoords, setRouteCoords] = useState<DriverLocation[]>([]);
  const [showOtp, setShowOtp] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial validation
  useEffect(() => {
    console.log('RideTracking - Received rideId:', rideId);
    if (!rideId) {
      console.error('No rideId provided in params');
      Alert.alert(
        'Error',
        'No ride ID provided',
        [{ text: 'Go Back', onPress: () => router.replace('/passenger') }]
      );
    }
  }, [rideId]);

  // Validate rideId on component mount
  useEffect(() => {
    console.log('Ride tracking mounted with rideId:', rideId);
    if (!rideId) {
      setError('No ride ID provided');
      Alert.alert('Error', 'No ride ID provided', [
        { text: 'Go Back', onPress: () => router.replace('/passenger') }
      ]);
    }
  }, [rideId]);
  
  // Function to show OTP
  const showCurrentOtp = () => {
    if (ride?.status === 'arrived' && ride?.otp) {
      Alert.alert(
        "Your OTP",
        `Show this OTP to your driver:\n\n${ride.otp}`,
        [{ text: "OK" }],
        { cancelable: false }
      );
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (rating: number, comment: string) => {
  try {
    if (!ride?.id || !ride?.driver?.id || !ride?.passenger_id) {
      console.error('Missing ride, driver, or passenger information');
      Alert.alert("Error", "Could not submit review: Missing information");
      return;
    }

    // passenger_id is already profiles.id
    const passengerId = ride.passenger_id;

    const { data, error } = await supabase
      .from("ride_reviews")
      .insert([
        {
          ride_id: ride.id,
          driver_id: ride.driver.id,
          passenger_id: passengerId,
          rating,
          comment: comment || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log("Review submitted successfully:", data);

    Alert.alert(
      "Thank You!",
      "Your feedback helps us improve our service.",
      [{ text: "OK", onPress: () => router.replace("/passenger") }]
    );

  } catch (e: any) {
    console.error("Failed to submit review:", e);
    Alert.alert(
      "Error",
      `Failed to submit review. ${e.message || ""}`,
      [{ text: "OK" }]
    );
  }
};


  // Fetch initial ride data
  useEffect(() => {
    if (!rideId) return;

    const channels: { [key: string]: any } = {};

    const setupSubscriptions = async () => {
      try {
        console.log('Setting up subscriptions for ride:', rideId);
        
        if (!rideId) {
          console.error('No rideId provided');
          Alert.alert("Error", "No ride ID provided");
          router.replace("/passenger");
          return;
        }

        setLoading(true);
        
        // Get initial ride data with driver info
        const { data: currentRide, error } = await supabase
          .from("rides")
          .select(`
            *,
            driver:driver_id (
              id,
              name,
              phone
            )
          `)
          .eq("id", rideId)
          .single();

        if (error) {
          console.error("Error fetching ride:", error);
          Alert.alert(
            "Error", 
            "Failed to fetch ride details. Please try again.",
            [
              { 
                text: "Go Back", 
                onPress: () => router.replace("/passenger") 
              },
              { 
                text: "Try Again", 
                onPress: () => setupSubscriptions() 
              }
            ]
          );
          return;
        }

        if (!currentRide) {
          console.error('Ride not found:', rideId);
          Alert.alert(
            "Error", 
            "This ride could not be found",
            [{ text: "Go Back", onPress: () => router.replace("/passenger") }]
          );
          return;
        }

        console.log('Fetched ride data:', {
          id: currentRide.id,
          status: currentRide.status,
          driver: currentRide.driver?.name,
          pickup: currentRide.pickup_address
        });
        
        setRide(currentRide);
        setLoading(false);

        if (currentRide?.driver_id) {
          // Get initial driver location
          const { data: driverLoc } = await supabase
            .from("driver_locations")
            .select("lat, lng")
            .eq("driver_id", currentRide.driver_id)
            .single();

          if (driverLoc) {
            setDriverLocation({
              latitude: parseFloat(driverLoc.lat),
              longitude: parseFloat(driverLoc.lng)
            });
          }

          // Subscribe to driver location updates
          channels.location = supabase
            .channel(`driver_location_${currentRide.driver_id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'driver_locations',
                filter: `driver_id=eq.${currentRide.driver_id}`
              },
              (payload: { new: { lat: number; lng: number } }) => {
                console.log('Driver location update:', payload);
                if (payload.new.lat && payload.new.lng) {
                  setDriverLocation({
                    latitude: Number(payload.new.lat),
                    longitude: Number(payload.new.lng)
                  });
                }
              }
            )
            .subscribe();
        }

        // Subscribe to ride status updates
        channels.ride = supabase
          .channel(`ride_${rideId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "rides",
              filter: `id=eq.${rideId}`
            },
            (payload: { new: RideData }) => {
              setRide(prev => ({ ...prev, ...payload.new }));

              // Show appropriate alerts based on status
              switch (payload.new.status) {
                case "accepted":
                  Alert.alert("Ride Accepted", "A driver has accepted your ride request!");
                  break;
                case "arrived":
  (async () => {
    // ✅ Generate OTP only if it doesn't already exist
    if (!payload.new.otp) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await supabase
        .from("rides")
        .update({ otp })
        .eq("id", rideId);

      Alert.alert(
        "Driver Arrived",
        `Your driver has arrived! Show this OTP to your driver:\n\n${otp}`,
        [{ text: "OK" }],
        { cancelable: false }
      );
    } else {
      // ✅ If OTP already exists, just show it
      Alert.alert(
        "Driver Arrived",
        `Your driver has arrived! Your OTP is:\n\n${payload.new.otp}`,
        [{ text: "OK" }],
        { cancelable: false }
      );
    }
  })();
  break;

                case "completed":
                  setShowReview(true);
                  break;
                case "cancelled":
                  Alert.alert("Ride Cancelled", "This ride has been cancelled");
                  router.replace("/passenger");
                  break;
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error("Error setting up subscriptions:", error);
        Alert.alert("Error", "Failed to initialize ride tracking");
      }
    };

    setupSubscriptions();

    // Cleanup subscriptions
    return () => {
      Object.values(channels).forEach(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [rideId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Ride not found</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.replace('/passenger')}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <MapLibreGL.MapView style={styles.map}>
        <MapLibreGL.Camera
          defaultSettings={{
            centerCoordinate: driverLocation 
              ? [driverLocation.longitude, driverLocation.latitude]
              : [ride.pickup_lng, ride.pickup_lat],
            zoomLevel: 14
          }}
        />

        {/* Pickup Point */}
        <MapLibreGL.PointAnnotation
          id="pickup"
          coordinate={[ride.pickup_lng, ride.pickup_lat]}
          title="Pickup"
        >
          <View style={[styles.markerView, { backgroundColor: 'green' }]} />
        </MapLibreGL.PointAnnotation>

        {/* Drop Point */}
        <MapLibreGL.PointAnnotation
          id="drop"
          coordinate={[ride.drop_lng, ride.drop_lat]}
          title="Drop"
        >
          <View style={[styles.markerView, { backgroundColor: 'red' }]} />
        </MapLibreGL.PointAnnotation>

        {/* Driver Location */}
        {driverLocation && (
          <MapLibreGL.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            title={`Driver ${ride.driver?.name || ''}`}
          >
            <View style={styles.carMarker}>
              <Ionicons name="car" size={30} color={theme.colors.primary} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Route Line */}
        {routeCoords.length > 0 && (
          <MapLibreGL.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoords.map(coord => [coord.longitude, coord.latitude])
              }
            }}
          >
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: theme.colors.primary,
                lineWidth: 3
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* Ride Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.statusText}>Status: {ride.status}</Text>
        
        {ride.status === "accepted" && (
          <Text style={styles.driverText}>
            Driver {ride.driver?.name} is heading to pickup location
          </Text>
        )}

        {ride.status === "arrived" && (
          <>
            <Text style={styles.driverText}>Driver has arrived at pickup!</Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={showCurrentOtp}
            >
              <Ionicons name="key-outline" size={24} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Show OTP to Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* OTP Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showOtp}
          onRequestClose={() => setShowOtp(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Your OTP</Text>
              <Text style={styles.otpText}>{ride.otp}</Text>
              <Text style={styles.otpSubtext}>
                Show this OTP to your driver to start the ride
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowOtp(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      {/* Review Modal */}
      <RideReviewModal
        visible={showReview}
        onClose={() => {
          setShowReview(false);
          router.replace("/passenger");
        }}
        onSubmit={handleReviewSubmit}
        driverName={ride?.driver?.name || "your driver"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  driverText: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    color: theme.colors.error,
  },
  otpButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  otpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  otpText: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.primary,
    letterSpacing: 2,
    marginVertical: 20,
  },
  otpSubtext: {
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  closeButton: {
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
  },
  carMarker: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  markerView: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
  },
});
