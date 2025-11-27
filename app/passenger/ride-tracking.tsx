// ride-tracking.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import RideReviewModal from "../../components/RideReviewModal";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { theme } from "../../utils/theme";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

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

export default function RideTracking() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string }>();
  const rideId = params?.rideId;

  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // WebView ref
  const webRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const firstFitRef = useRef(false);

  // Channels ref for cleanup
  const channelsRef = useRef<any>({});

  // Inline HTML for tracking map (clean, no polygons). Non-draggable map, small circle driver marker with border.
  const mapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #f6f6f6; }
      .leaflet-container { -webkit-tap-highlight-color: transparent; }
      .pin-label { font-size: 12px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
      // Basic tile (MapTiler public streets - replace key if you want)
      const tileUrl = "https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=vt8j60co865zsOqac3J6";

      // Create map with interactions disabled (user cannot drag)
      const map = L.map('map', {
        zoomControl: true,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        attributionControl: false
      }).setView([12.6820, 78.6201], 14);

      L.tileLayer(tileUrl, { maxZoom: 19, tileSize: 512, zoomOffset: -1 }).addTo(map);

      // Icons (professional)
      const pickupIcon = L.divIcon({
        html: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6" fill="#2e7d32" stroke="#fff" stroke-width="2"/></svg>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const dropIcon = L.divIcon({
        html: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6" fill="#d32f2f" stroke="#fff" stroke-width="2"/></svg>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      // driver minimal circle with border
      const driverIcon = L.divIcon({
        html: '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#ffffff" stroke="#1e88e5" stroke-width="2"/></svg>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      let pickupMarker = null;
      let dropMarker = null;
      let driverMarker = null;
      let routeLine = null;

      function drawRoute(coordsArray) {
        if (routeLine) {
          try { map.removeLayer(routeLine); } catch(e){}
          routeLine = null;
        }
        if (!coordsArray || coordsArray.length < 2) return;
        const latlngs = coordsArray.map(p => [p.latitude, p.longitude]);
        routeLine = L.polyline(latlngs, { color: '#1e88e5', weight: 4, opacity: 0.9 }).addTo(map);
      }

      function setPickup(lat, lng) {
        if (!pickupMarker) {
          pickupMarker = L.marker([lat, lng], { icon: pickupIcon }).addTo(map);
        } else {
          pickupMarker.setLatLng([lat, lng]);
        }
      }
      function setDrop(lat, lng) {
        if (!dropMarker) {
          dropMarker = L.marker([lat, lng], { icon: dropIcon }).addTo(map);
        } else {
          dropMarker.setLatLng([lat, lng]);
        }
      }

      // Smooth animate driver marker (linear interpolation)
      let animFrame = null;
      let animStart = null;
      let animDuration = 600; // ms
      let startPos = null;
      let endPos = null;

      function animateDriverTo(lat, lng) {
        if (!driverMarker) {
          driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(map);
          return;
        }
        // cancel previous
        if (animFrame) {
          cancelAnimationFrame(animFrame);
          animFrame = null;
        }
        startPos = driverMarker.getLatLng();
        endPos = L.latLng(lat, lng);
        animStart = performance.now();

        function step(now) {
          const t = Math.min(1, (now - animStart) / animDuration);
          // linear
          const latNow = startPos.lat + (endPos.lat - startPos.lat) * t;
          const lngNow = startPos.lng + (endPos.lng - startPos.lng) * t;
          driverMarker.setLatLng([latNow, lngNow]);
          if (t < 1) animFrame = requestAnimationFrame(step);
          else animFrame = null;
        }
        animFrame = requestAnimationFrame(step);
      }

      // Fit bounds when requested
      function fitBoundsToPoints(points) {
        if (!points || points.length === 0) return;
        try {
          const latlngs = points.map(p => [p.latitude, p.longitude]);
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds.pad(0.15), { animate: true, duration: 0.6 });
        } catch (e) { }
      }

      // Handle messages from RN
      function handleMessage(raw) {
        let msg = null;
        try {
          msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          try { msg = raw.data ? JSON.parse(raw.data) : null; } catch(e) { msg = null; }
        }
        if (!msg) return;

        if (msg.type === 'update') {
          if (msg.pickup) setPickup(msg.pickup.latitude || msg.pickup.lat, msg.pickup.longitude || msg.pickup.lng);
          if (msg.drop) setDrop(msg.drop.latitude || msg.drop.lat, msg.drop.longitude || msg.drop.lng);
          if (msg.routeCoords) drawRoute(msg.routeCoords);
          // if cameraCenter present and allowed, center
          if (msg.fitBounds) fitBoundsToPoints(msg.fitBounds);
          return;
        }

        if (msg.type === 'updateDriver') {
          const lat = msg.driver.latitude || msg.driver.lat;
          const lng = msg.driver.longitude || msg.driver.lng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            animateDriverTo(lat, lng);
          }
          // Optionally center first time when driver arrives
          if (msg.firstFit) {
            // Fit pickup, drop and driver
            const pts = [];
            if (pickupMarker) pts.push(pickupMarker.getLatLng());
            if (dropMarker) pts.push(dropMarker.getLatLng());
            pts.push(L.latLng(lat, lng));
            fitBoundsToPoints(pts.map(p=>({latitude: p.lat, longitude: p.lng})));
          }
          return;
        }

        if (msg.type === 'setCamera' && msg.center) {
          map.setView([msg.center.lat, msg.center.lng], msg.zoom || map.getZoom());
          return;
        }
      }

      // Attach listeners (React Native WebView uses message events)
      document.addEventListener('message', (e) => handleMessage(e.data));
      window.addEventListener('message', (e) => handleMessage(e.data));
      if (window.ReactNativeWebView && window.ReactNativeWebView.onMessage) {
        window.ReactNativeWebView.onMessage = (e) => handleMessage(e);
      }

      // send ready
      setTimeout(() => {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        } catch(e){}
      }, 150);
    </script>
  </body>
  </html>
  `;

  // Post update payload to webview (pickup, drop, route)
  const postMapUpdate = (opts?: { firstFit?: boolean }) => {
    if (!webRef.current) return;
    if (!ride) return;

    const payload: any = {
      type: "update",
      pickup: { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) },
      drop: { latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) },
      routeCoords: [
        { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) },
        { latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) }
      ],
      fitBounds: [
        { latitude: Number(ride.pickup_lat), longitude: Number(ride.pickup_lng) },
        { latitude: Number(ride.drop_lat), longitude: Number(ride.drop_lng) }
      ]
    };

    try {
      webRef.current.postMessage(JSON.stringify(payload));
      // If driver location exists and we want to center to include driver
      if (driverLocation) {
        const driverPayload = {
          type: "updateDriver",
          driver: { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
          firstFit: opts?.firstFit === true
        };
        webRef.current.postMessage(JSON.stringify(driverPayload));
      }
    } catch (e) {
      console.warn("Failed to post update to webview:", e);
    }
  };

  // Handle messages coming from the webview
  const onWebMessage = (event: any) => {
    const raw = event.nativeEvent?.data;
    if (!raw) return;
    try {
      const msg = JSON.parse(raw);
      if (msg?.type === "mapReady") {
        mapReadyRef.current = true;
        // Post initial markers when map is ready
        postMapUpdate({ firstFit: true });
      }
    } catch (e) {
      // ignore
    }
  };

  // Setup ride & subs
  useEffect(() => {
    if (!rideId) {
      Alert.alert("Error", "No ride ID provided", [{ text: "Go Back", onPress: () => router.replace("/passenger") }]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
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

        if (error || !currentRide) {
          console.error("Error fetching ride:", error);
          Alert.alert("Error", "Failed to fetch ride details", [
            { text: "Go Back", onPress: () => router.replace("/passenger") },
          ]);
          setLoading(false);
          return;
        }

        if (!mounted) return;
        setRide(currentRide);
        setLoading(false);

        // Post markers once ride loaded (if webview is already ready)
        if (mapReadyRef.current) postMapUpdate({ firstFit: true });

        // initial driver location fetch
        if (currentRide.driver_id) {
          const { data: driverLoc } = await supabase
            .from("driver_locations")
            .select("lat, lng")
            .eq("driver_id", currentRide.driver_id)
            .single();

          if (driverLoc && mounted) {
            const dl = { latitude: Number(driverLoc.lat), longitude: Number(driverLoc.lng) };
            setDriverLocation(dl);
            // send to webview
            if (mapReadyRef.current) {
              try {
                webRef.current?.postMessage(JSON.stringify({ type: "updateDriver", driver: dl, firstFit: true }));
              } catch (e) {}
            }
          }

          // subscribe to driver location updates
          const channelKey = `driver_location_${currentRide.driver_id}`;
          const ch = supabase
            .channel(channelKey)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "driver_locations",
                filter: `driver_id=eq.${currentRide.driver_id}`,
              },
              (payload: any) => {
                if (!payload?.new) return;
                const lat = Number(payload.new.lat);
                const lng = Number(payload.new.lng);
                if (isNaN(lat) || isNaN(lng)) return;
                const dl = { latitude: lat, longitude: lng };
                setDriverLocation(dl);

                // send update to webview
                if (mapReadyRef.current) {
                  try {
                    webRef.current?.postMessage(JSON.stringify({ type: "updateDriver", driver: dl }));
                  } catch (e) {}
                }
              }
            )
            .subscribe();

          channelsRef.current.location = ch;
        }

        // subscribe to ride changes (status etc)
        const rideChannelKey = `ride_${rideId}`;
        const rideCh = supabase
          .channel(rideChannelKey)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
            (payload: any) => {
              if (!payload?.new) return;
              setRide((prev) => ({ ...(prev || {}), ...payload.new }));

              switch (payload.new.status) {
                case "accepted":
                  Alert.alert("Ride Accepted", "A driver has accepted your ride request!");
                  break;
                case "arrived":
                  (async () => {
                    if (!payload.new.otp) {
                      const otp = Math.floor(100000 + Math.random() * 900000).toString();
                      await supabase.from("rides").update({ otp }).eq("id", rideId);
                      Alert.alert("Driver Arrived", `Your driver has arrived!\n\nOTP: ${otp}`);
                    } else {
                      Alert.alert("Driver Arrived", `Your driver has arrived!\n\nOTP: ${payload.new.otp}`);
                    }
                  })();
                  break;
                case "completed":
                  setShowReview(true);
                  break;
                case "cancelled":
                  Alert.alert("Ride Cancelled", payload.new.cancellation_reason || "This ride has been cancelled.");
                  router.replace("/passenger");
                  break;
                default:
                  break;
              }
            }
          )
          .subscribe();

        channelsRef.current.ride = rideCh;
      } catch (e) {
        console.error("Error initializing ride tracking:", e);
        Alert.alert("Error", "Failed to initialize ride tracking");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      // cleanup supabase channels
      const keys = Object.keys(channelsRef.current || {});
      keys.forEach((k) => {
        const ch = channelsRef.current[k];
        if (ch) supabase.removeChannel(ch);
      });
      channelsRef.current = {};
    };
  }, [rideId]);

  // When ride or driver changes, ensure webview gets updated markers & route
  useEffect(() => {
    if (!ride) return;
    // send update to webview
    // If this is the first time we have driver location, include firstFit
    const firstFit = !firstFitRef.current;
    postMapUpdate({ firstFit });
    if (firstFit) firstFitRef.current = true;
  }, [ride]);

  useEffect(() => {
    if (!driverLocation || !ride) return;
    // send driver update to webview
    try {
      webRef.current?.postMessage(
        JSON.stringify({ type: "updateDriver", driver: driverLocation })
      );
    } catch (e) {
      // ignore
    }
  }, [driverLocation]);

  // Show loading state
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
      {/* Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onWebMessage}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          style={{ flex: 1, backgroundColor: "#f6f6f6" }}
        />
      </View>

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
              onPress={() => {
                if (ride?.otp) {
                  Alert.alert("Your OTP", `Show this OTP to your driver:\n\n${ride.otp}`);
                } else {
                  Alert.alert("Info", "OTP not available yet.");
                }
              }}
            >
              <Ionicons name="key-outline" size={24} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Show OTP to Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Review Modal */}
        <RideReviewModal
          visible={showReview}
          onClose={() => {
            setShowReview(false);
            router.replace("/passenger");
          }}
          onSubmit={async (rating, comment) => {
            try {
              if (!ride?.id || !ride?.driver?.id || !ride?.passenger_id) {
                Alert.alert("Error", "Missing information for review");
                return;
              }
              const passengerId = ride.passenger_id;
              const { data, error } = await supabase
                .from("ride_reviews")
                .insert([{
                  ride_id: ride.id,
                  driver_id: ride.driver.id,
                  passenger_id: passengerId,
                  rating,
                  comment: comment || null
                }]).select().single();
              if (error) throw error;
              Alert.alert("Thanks!", "Review submitted");
              setShowReview(false);
              router.replace("/passenger");
            } catch (e: any) {
              console.error("Review submit failed:", e);
              Alert.alert("Error", "Failed to submit review");
            }
          }}
          driverName={ride?.driver?.name || "your driver"}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  infoCard: {
    backgroundColor: "white",
    padding: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  driverText: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
});

