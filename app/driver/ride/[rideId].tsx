import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Modal,
  TextInput,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";


// 🛣️ Function to fetch directions from Google Directions API
async function getDirections(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;
  const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY;
  try {
    const resp = await fetch(
  `https://us1.locationiq.com/v1/directions/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline`
);

const json = await resp.json();

if (json.routes && json.routes.length) {
  const points = decodePolyline(json.routes[0].geometry);
  return points.map((p: any) => ({
    latitude: p[0],
    longitude: p[1],
  }));
}

    return [];
  } catch (e) {
    console.error("Error fetching directions:", e);
    return [];
  }
}

// 🔑 Polyline decoder
function decodePolyline(t: string) {
  let points = [];
  let index = 0,
    len = t.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function RideScreen() {
  const { rideId } = useLocalSearchParams();
  const router = useRouter();

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  // 🚗 Fetch ride from DB
  const fetchRide = async () => {
    if (!rideId) {
      Alert.alert("Error", "No rideId provided!");
      router.replace("/driver");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("rides")
        .select(`
          *,
          passenger:passenger_id(name, phone),
          driver:driver_id(name)
        `)
        .eq("id", rideId)
        .single();

      if (error) throw error;

      console.log('Fetched ride:', {
        id: data.id,
        status: data.status,
        passenger: data.passenger?.name,
        pickup: data.pickup_address
      });

      setRide(data);
    } catch (error: any) {
      console.error('Error fetching ride:', error);
      Alert.alert("Error", "Could not load ride details");
      router.replace("/driver");
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance * 1000; // Convert to meters
  };

  // 📍 Watch driver location & update route
  useEffect(() => {
    let subscription: any;
    let hasNotifiedArrival = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location to continue.");
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20, // update every 20 meters
        },
        async (loc) => {
          const newLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setCurrentLocation(newLocation);

          // Update driver location in database
          try {
            await supabase
              .from('driver_locations')
              .upsert({
                driver_id: ride.driver_id,
                lat: newLocation.latitude,
                lng: newLocation.longitude,
                status: 'busy',
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'driver_id'
              });
          } catch (error) {
            console.error('Error updating location:', error);
          }

          // Check proximity to pickup location if ride is accepted
          if (ride?.status === "accepted" && !hasNotifiedArrival) {
            const distance = calculateDistance(
              newLocation.latitude,
              newLocation.longitude,
              ride.pickup_lat,
              ride.pickup_lng
            );
            
            // If within 100 meters of pickup and haven't notified yet
            if (distance <= 100) {
              hasNotifiedArrival = true;
              Alert.alert(
                "Near Pickup Location",
                "You are near the pickup location. Click 'Mark as Arrived' when you reach the exact spot."
              );
            }
          }

          // 🔄 update polyline depending on ride status
          if (ride) {
            if (["accepted", "arrived"].includes(ride.status)) {
              const coords = await getDirections(newLocation, {
                latitude: ride.pickup_lat,
                longitude: ride.pickup_lng,
              });
              setRouteCoords(coords);
            } else if (ride.status === "in_progress") {
              const coords = await getDirections(newLocation, {
                latitude: ride.drop_lat,
                longitude: ride.drop_lng,
              });
              setRouteCoords(coords);
            }
          }
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [ride]);

  // 🔄 Update ride status
  const verifyOTPAndStartRide = async () => {
    if (!rideId || !otpInput) return;
    setLoading(true);
    
    // First verify the OTP
    const { data: rideData, error: verifyError } = await supabase
      .from("rides")
      .select("otp")
      .eq("id", rideId)
      .single();
      
    if (verifyError || !rideData) {
      setLoading(false);
      Alert.alert("Error", "Failed to verify OTP");
      return;
    }

    if (rideData.otp !== otpInput) {
      setLoading(false);
      Alert.alert("Invalid OTP", "Please check the OTP and try again");
      return;
    }

    // If OTP is correct, update the ride status
    const { error } = await supabase
      .from("rides")
      .update({ status: "in_progress" })
      .eq("id", rideId);
      
    setLoading(false);
    setOtpModalVisible(false);
    
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setRide((prev: any) => ({ ...prev, status: "in_progress" }));
    }
  };

  const updateStatus = async (newStatus: 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled') => {
    if (!rideId) return;
    if (loading) return;
    setLoading(true);
    
    try {
      // Do a simple update with no transformations
      const { data, error } = await supabase
        .from("rides")
        .update({ status: newStatus })
        .eq("id", rideId)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        Alert.alert('Error', 'Failed to update ride status. Please try again.');
        setLoading(false);
        return;
      }

      if (data) {
        setRide(data);
        
        if (newStatus === 'arrived') {
          Alert.alert('Success', "You've marked yourself as arrived. Please wait for the passenger's OTP.");
        }
      }

      if (error) {
        console.error('Supabase error:', error);
        Alert.alert('Error', `Failed to update status: ${error.message}`);
        return;
      }

      console.log('Update successful:', data);
      
      // Update local state
      setRide((prev: any) => ({ ...prev, status: newStatus }));

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setRide((prev: any) => ({ ...prev, status: newStatus }));

      // Handle post-update actions
      if (["completed", "cancelled"].includes(newStatus)) {
  try {
    // 1️⃣ Update driver location status to online
    await supabase
      .from("driver_locations")
      .update({ status: "online" })
      .eq("driver_id", ride.driver_id);

    // 2️⃣ Update driver_docs to mark driver as available
    await supabase
      .from("driver_docs")
      .update({ current_status: "available" })
      .eq("driver_id", ride.driver_id);

    // 3️⃣ Redirect driver back to main driver screen
    router.replace("/driver");

    // 4️⃣ Optional: console log for debugging
    console.log(
      `Driver ${ride.driver_id} marked available and location set online. Ride ${newStatus}.`
    );
  } catch (error) {
    console.error(
      "Error updating driver location and status after ride completion/cancellation:",
      error
    );
    Alert.alert(
      "Update Error",
      "Could not update your status. Please try again."
    );
  }
}


      // Show success message
      if (newStatus === "arrived") {
        Alert.alert("Success", "You've arrived at the pickup location. Please wait for the passenger's OTP.");
      }

    } catch (error: any) {
      console.error("Error in updateStatus:", error);
      Alert.alert("Error", error.message || "Failed to update ride status");
    } finally {
      setLoading(false);
    }
  };

  if (!ride) {
    return (
      <View style={styles.center}>
        <Text>Loading ride...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🗺️ Map */}
      <MapView
        style={styles.map}
        region={{
          latitude: currentLocation?.latitude || ride.pickup_lat,
          longitude: currentLocation?.longitude || ride.pickup_lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Driver"
            pinColor="blue"
          />
        )}

        <Marker
          coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}
          title="Pickup"
          pinColor="green"
        />

        {ride.drop_lat && ride.drop_lng && (
          <Marker
            coordinate={{ latitude: ride.drop_lat, longitude: ride.drop_lng }}
            title="Drop"
            pinColor="red"
          />
        )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="blue"
          />
        )}
      </MapView>

      {/* 📋 Ride Info */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>Ride Details</Text>
        <Text>Passenger: {ride.passenger_name || "Unknown"}</Text>
        <Text>Phone: {ride.passenger_phone || "N/A"}</Text>
        <Text>Pickup: {ride.pickup_address}</Text>
        <Text>Drop: {ride.drop_address}</Text>
        <Text>Status: {ride.status}</Text>

        {/* Action button */}
        {ride.status === "accepted" && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log('Current ride status:', ride.status);
              updateStatus("arrived");
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Mark as Arrived'}</Text>
          </TouchableOpacity>
        )}
        {ride.status === "arrived" && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setOtpModalVisible(true)}
          >
            <Text style={styles.buttonText}>Start Ride (Enter OTP)</Text>
          </TouchableOpacity>
        )}
        
        {/* OTP Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={otpModalVisible}
          onRequestClose={() => setOtpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter OTP from Passenger</Text>
              <TextInput
                style={styles.otpInput}
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.button, { marginTop: 20 }]}
                onPress={verifyOTPAndStartRide}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Verifying..." : "Verify & Start"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#555", marginTop: 10 }]}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {ride.status === "in_progress" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red" }]}
            onPress={() => updateStatus("completed")}
          >
            <Text style={styles.buttonText}>End Ride</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#555" }]}
          onPress={() =>
            Alert.alert("Cancel Ride", "Are you sure?", [
              { text: "No" },
              { text: "Yes, Cancel", onPress: () => updateStatus("cancelled") },
            ])
          }
        >
          <Text style={styles.buttonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  infoBox: {
    padding: 16,
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  button: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
  },
});
