// [rideId].tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";

// --- keep your directions / polyline decode helpers (unchanged) ---
async function getDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
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

// ---------------- Main component ----------------
export default function RideScreen() {
  const { rideId } = useLocalSearchParams();
  const router = useRouter();

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  // WebView ref + map-ready flags
  const webRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const firstFitRef = useRef(false);

  // Watcher ref
  const locationWatcherRef = useRef<any>(null);

  // ------------ Inline HTML for tracking map ------------
  // - non-draggable (dragging: false)
  // - pinch / touch zoom allowed (touchZoom: true)
  const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #f7f7f7; }
      .leaflet-container { -webkit-tap-highlight-color: transparent; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
      const tileUrl = "https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=vt8j60co865zsOqac3J6";
      // create map: dragging disabled, touchZoom allowed
      const map = L.map('map', {
        zoomControl: true,
        dragging: false,
        touchZoom: true,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: true,
        attributionControl: false
      }).setView([12.6820, 78.6201], 14);
  // ====== CITY BOUNDS (prevents zooming out to all India) ======
const cityBounds = L.latLngBounds(
  [12.6500, 78.5900], // South-West corner
  [12.7000, 78.6500]  // North-East corner
);

// Lock map inside the city bounds
map.setMaxBounds(cityBounds.pad(0.01));
map.setMinZoom(14);       // Prevent zooming out too far
map.setMaxZoom(19.5);     // Allow very close zoom-in

      L.tileLayer(tileUrl, { maxZoom: 19, tileSize: 512, zoomOffset: -1 }).addTo(map);

      // icons: pickup (green), drop (red), driver minimal circle with border
      const pickupIcon = L.divIcon({
        html: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6" fill="#2e7d32" stroke="#fff" stroke-width="2"/></svg>',
        className: '',
        iconSize: [26,26],
        iconAnchor: [13,13]
      });
      const dropIcon = L.divIcon({
        html: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6" fill="#d32f2f" stroke="#fff" stroke-width="2"/></svg>',
        className: '',
        iconSize: [26,26],
        iconAnchor: [13,13]
      });
      const driverIcon = L.divIcon({
        html: '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#fff" stroke="#1e88e5" stroke-width="2"/></svg>',
        className: '',
        iconSize: [18,18],
        iconAnchor: [9,9]
      });

      let pickupMarker = null;
      let dropMarker = null;
      let driverMarker = null;
      let routeLine = null;

      // draw route once
      function drawRoute(coords) {
        if (routeLine) {
          try { map.removeLayer(routeLine) } catch(e){}
          routeLine = null;
        }
        if (!coords || coords.length < 2) return;
        const latlngs = coords.map(p => [p.latitude, p.longitude]);
        routeLine = L.polyline(latlngs, { color: '#1e88e5', weight: 4, opacity: 0.9 }).addTo(map);
      }

      // set pickup/drop
      function setPickup(lat, lng) {
        if (!pickupMarker) pickupMarker = L.marker([lat,lng], { icon: pickupIcon }).addTo(map);
        else pickupMarker.setLatLng([lat,lng]);
      }
      function setDrop(lat, lng) {
        if (!dropMarker) dropMarker = L.marker([lat,lng], { icon: dropIcon }).addTo(map);
        else dropMarker.setLatLng([lat,lng]);
      }

      // smooth animate driver marker
      let animFrame = null, animStart = null, animDuration = 600, startPos=null, endPos=null;
      function animateDriverTo(lat, lng) {
        if (!driverMarker) {
          driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(map);
          return;
        }
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
        startPos = driverMarker.getLatLng();
        endPos = L.latLng(lat, lng);
        animStart = performance.now();
        function step(now) {
          const t = Math.min(1, (now - animStart)/animDuration);
          const latNow = startPos.lat + (endPos.lat - startPos.lat) * t;
          const lngNow = startPos.lng + (endPos.lng - startPos.lng) * t;
          driverMarker.setLatLng([latNow, lngNow]);
          if (t < 1) animFrame = requestAnimationFrame(step);
          else animFrame = null;
        }
        animFrame = requestAnimationFrame(step);
      }

      function fitBoundsToPoints(points) {
        if (!points || points.length === 0) return;
        try {
          const latlngs = points.map(p => [p.latitude, p.longitude]);
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds.pad(0.15), { animate: true, duration: 0.6 });
        } catch(e){}
      }

      // handle messages from RN
      function handleMessage(raw) {
        let msg = null;
        try {
          msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch(e) {
          try { msg = raw.data ? JSON.parse(raw.data) : null; } catch(e){ msg = null; }
        }
        if (!msg) return;

        if (msg.type === 'update') {
          if (msg.pickup) setPickup(msg.pickup.latitude || msg.pickup.lat, msg.pickup.longitude || msg.pickup.lng);
          if (msg.drop) setDrop(msg.drop.latitude || msg.drop.lat, msg.drop.longitude || msg.drop.lng);
          if (msg.routeCoords) drawRoute(msg.routeCoords);
          if (msg.fitBounds) fitBoundsToPoints(msg.fitBounds);
          return;
        }

        if (msg.type === 'updateDriver') {
          const lat = msg.driver.latitude || msg.driver.lat;
          const lng = msg.driver.longitude || msg.driver.lng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            animateDriverTo(lat, lng);
          }
          if (msg.firstFit) {
    // 1) Fit full route ONCE
    const pts = [];
    if (pickupMarker) pts.push(pickupMarker.getLatLng());
    if (dropMarker) pts.push(dropMarker.getLatLng());
    pts.push(L.latLng(lat, lng));
    fitBoundsToPoints(pts.map(p=>({latitude:p.lat, longitude:p.lng})));

    // 2) After 2 seconds switch to driver mode (zoomed-in)
    setTimeout(() => {
        map.setView([lat, lng], 17.4);  // 17 = good road-level, 18 = very close
    }, 2000);
}
 else if (msg.center) {
            map.setView([lat, lng], map.getZoom());
          }
          return;
        }

        if (msg.type === 'setCamera' && msg.center) {
          map.setView([msg.center.lat, msg.center.lng], msg.zoom || map.getZoom());
          return;
        }
      }

      document.addEventListener('message', (e)=> handleMessage(e.data));
      window.addEventListener('message', (e)=> handleMessage(e.data));
      if (window.ReactNativeWebView && window.ReactNativeWebView.onMessage) {
        window.ReactNativeWebView.onMessage = (e)=> handleMessage(e);
      }

      setTimeout(()=> {
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' })); } catch(e){}
      }, 150);
    </script>
  </body>
  </html>
  `;

  // ----------------- helper: post initial map update -----------------
  
  const postMapUpdate = (opts?: { firstFit?: boolean }) => {
    if (!webRef.current || !ride) return;
    const payload: any = {
      type: "update",
      pickup: { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) },
      drop: { latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) },
      routeCoords: routeCoords && routeCoords.length > 0 ? routeCoords : undefined,
      fitBounds: [
        { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) },
        ...(ride.drop_lat && ride.drop_lng ? [{ latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) }] : [])
      ]
    };
    try {
      webRef.current.postMessage(JSON.stringify(payload));
      // send driver if we have one
      if (currentLocation) {
        webRef.current.postMessage(JSON.stringify({
          type: "updateDriver",
          driver: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          firstFit: opts?.firstFit === true
        }));
      }
    } catch (e) {
      console.warn("postMapUpdate failed", e);
    }
  };

  // handle messages from webview
  const onWebMessage = (event: any) => {
    const raw = event.nativeEvent?.data;
    if (!raw) return;
    try {
      const msg = JSON.parse(raw);
      if (msg?.type === "mapReady") {
        mapReadyRef.current = true;
        // send initial markers + route and ask fit once
        postMapUpdate({ firstFit: true });
        firstFitRef.current = true;
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  // ---------- fetch ride ----------
  useEffect(() => {
    if (!rideId) {
      Alert.alert("Error", "No rideId provided!");
      router.replace("/driver");
      return;
    }
    let mounted = true;
    (async () => {
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

        if (error || !data) {
          console.error("Could not fetch ride:", error);
          Alert.alert("Error", "Could not load ride details");
          router.replace("/driver");
          return;
        }

        if (!mounted) return;
        setRide(data);

        // compute full route once (driver -> pickup if accepted, else maybe pickup->drop)
        try {
          // if driver available, origin is current driver location (try fetch from driver_locations)
          let origin = null;
          if (data.driver_id) {
            const { data: driverLoc } = await supabase
              .from("driver_locations")
              .select("lat, lng")
              .eq("driver_id", data.driver_id)
              .single();
            if (driverLoc && driverLoc.lat && driverLoc.lng) {
              origin = { latitude: Number(driverLoc.lat), longitude: Number(driverLoc.lng) };
            }
          }

          // if origin not available, fallback to pickup (so polyline from pickup->drop)
          if (!origin) origin = { latitude: Number(data.pickup_lat), longitude: Number(data.pickup_lng) };

          // route should be from origin -> pickup when accepted/arrived, else pickup->drop
          let dst = null;
          if (data.status === "accepted" || data.status === "arrived") {
            dst = { latitude: Number(data.pickup_lat), longitude: Number(data.pickup_lng) };
          } else {
            dst = { latitude: Number(data.drop_lat), longitude: Number(data.drop_lng) };
          }

          // Fetch directions once and set polyline
          const route = await getDirections(origin, dst);
          if (route && route.length) {
            setRouteCoords(route);
            // notify webview if ready
            if (mapReadyRef.current) {
              webRef.current?.postMessage(JSON.stringify({ type: "update", routeCoords: route }));
            }
          } else {
            // fallback: send straight line between pickup and drop
            const fallback = [
              { latitude: Number(data.pickup_lat), longitude: Number(data.pickup_lng) },
              ...(data.drop_lat && data.drop_lng ? [{ latitude: Number(data.drop_lat), longitude: Number(data.drop_lng) }] : [])
            ];
            setRouteCoords(fallback);
            if (mapReadyRef.current) {
              webRef.current?.postMessage(JSON.stringify({ type: "update", routeCoords: fallback }));
            }
          }
        } catch (e) {
          console.warn("Failed to compute route:", e);
        }
      } catch (e) {
        console.error("fetchRide failed", e);
      }
    })();

    return () => { mounted = false; };
  }, [rideId]);

  // ---------- start watching driver's own location and posting updates to DB + WebView ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      // request permission and start watching
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Enable location to continue.");
          return;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5, // update every ~5 meters
            timeInterval: 2000,
          },
          async (loc) => {
            if (!mounted) return;
            const newLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCurrentLocation(newLocation);

            // update driver_locations table for others to read
            try {
              if (ride?.driver_id) {
                await supabase
                  .from("driver_locations")
                  .upsert(
                    {
                      driver_id: ride.driver_id,
                      lat: newLocation.latitude,
                      lng: newLocation.longitude,
                      status: ride?.status === "in_progress" ? "busy" : "on_trip",
                      last_updated: new Date().toISOString(),
                    },
                    { onConflict: "driver_id" }
                  );
              }
            } catch (e) {
              console.warn("Failed to upsert driver_locations:", e);
            }

            // post driver update to webview (center while moving)
            try {
              webRef.current?.postMessage(
                JSON.stringify({
                  type: "updateDriver",
                  driver: { latitude: newLocation.latitude, longitude: newLocation.longitude },
                  center: true
                })
              );
            } catch (e) {
              // ignore
            }
          }
        );

        locationWatcherRef.current = sub;
      } catch (e) {
        console.error("watchPositionAsync failed:", e);
      }
    })();

    return () => {
      mounted = false;
      if (locationWatcherRef.current) {
        try {
          locationWatcherRef.current.remove();
        } catch (e) {}
        locationWatcherRef.current = null;
      }
    };
  }, [ride?.driver_id, ride?.status]);

  // when routeCoords or ride load, post pickup/drop/route to webview (if ready)
  useEffect(() => {
    if (!ride) return;
    if (!mapReadyRef.current) return;
    postMapUpdate({});
  }, [routeCoords, ride]);

  // ------------- status update / OTP logic (kept from your original file) -------------
  const verifyOTPAndStartRide = async () => {
    if (!rideId || !otpInput) return;
    setLoading(true);

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
      // once ride starts, recompute route to drop and send to webview
      try {
        const origin = currentLocation || { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) };
        const dst = { latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) };
        const route = await getDirections(origin, dst);
        setRouteCoords(route.length ? route : [
          { latitude: ride.pickup_lat, longitude: ride.pickup_lng },
          { latitude: ride.drop_lat, longitude: ride.drop_lng }
        ]);
        if (mapReadyRef.current) webRef.current?.postMessage(JSON.stringify({ type: "update", routeCoords: route }));
      } catch (e) {
        console.warn("Failed to get route after start:", e);
      }
    }
    
  };

const updateStatus = async (newStatus) => {
  if (!rideId || loading) return;
  setLoading(true);

  try {
    // 1️⃣ Update only the status
    const { error: updateError } = await supabase
      .from("rides")
      .update({ status: newStatus })
      .eq("id", rideId);

    if (updateError) {
      Alert.alert("Error", "Failed to update status");
      setLoading(false);
      return;
    }

    // 2️⃣ Immediately refetch full ride with passenger relation
    const { data: fullRide, error: fetchError } = await supabase
      .from("rides")
      .select(`
        *,
        passenger:passenger_id(name, phone),
        driver:driver_id(name)
      `)
      .eq("id", rideId)
      .single();

    if (fetchError || !fullRide) {
      Alert.alert("Error", "Failed to reload ride");
      setLoading(false);
      return;
    }

    // 3️⃣ Update UI with CORRECT passenger data
    setRide(fullRide);

    // 4️⃣ Handle navigation after completed/cancelled
    if (["completed", "cancelled"].includes(newStatus)) {
      await supabase.from("driver_locations")
        .update({ status: "online" })
        .eq("driver_id", ride.driver_id);

      await supabase.from("driver_docs")
        .update({ current_status: "available" })
        .eq("driver_id", ride.driver_id);

      router.replace("/driver");
    }

    if (newStatus === "arrived") {
      Alert.alert("Success", "You've arrived at the pickup location.");
    }

  } catch (err) {
    Alert.alert("Error", err.message);
  }

  setLoading(false);
};


  // ------------- if ride not loaded show loading -------------
  if (!ride) {
    return (
      <View style={styles.center}>
        <Text>Loading ride...</Text>
      </View>
    );
  }

  // ---------------------- UI ----------------------
  return (
    <View style={styles.container}>
      {/* Map WebView */}
      <View style={styles.map}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onWebMessage}
          mixedContentMode="always"
          style={{ backgroundColor: "#f7f7f7" }}
        />
      </View>

      {/* Ride Info */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>Ride Details</Text>
        <Text>Passenger: {ride.passenger?.name || "Unknown"}</Text>
        <Text>Phone: {ride.passenger?.phone || "N/A"}</Text>
        <Text>Pickup: {ride.pickup_address}</Text>
        <Text>Drop: {ride.drop_address}</Text>
        <Text>Status: {ride.status}</Text>

        {ride.status === "accepted" && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => updateStatus("arrived")}
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
        <Modal animationType="slide" transparent visible={otpModalVisible} onRequestClose={() => setOtpModalVisible(false)}>
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
              <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={verifyOTPAndStartRide} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Verifying..." : "Verify & Start"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: "#555", marginTop: 10 }]} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {ride.status === "in_progress" && (
          <TouchableOpacity style={[styles.button, { backgroundColor: "red" }]} onPress={() => updateStatus("completed")}>
            <Text style={styles.buttonText}>End Ride</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: "#555" }]} onPress={() =>
          Alert.alert("Cancel Ride", "Are you sure?", [
            { text: "No" },
            { text: "Yes, Cancel", onPress: () => updateStatus("cancelled") },
          ])
        }>
          <Text style={styles.buttonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
}

// ---------------------- styles ----------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, minHeight: 260 },
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
    width: Platform.OS === "web" ? 420 : "85%",
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
