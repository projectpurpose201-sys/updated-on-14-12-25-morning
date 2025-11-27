import "react-native-reanimated";
import React, { useState, useEffect, useRef } from "react";
import AdvertisementBanner from "../../components/AdvertisementBanner";
import PassengerBottomNav from "../../components/BottomNavBar";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  BackHandler,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSession } from "../../contexts/AuthContext";
import { theme } from "../../utils/theme";
import { supabase } from "../../utils/supabaseClient";
import { StatusBar as RNStatusBar } from "react-native";
import { polygons, getAreaName, getPolygonCenter } from "../../utils/geoUtils";
import { getNearestStreet, StreetEntry } from "../../utils/locationUtils";
import { ToastAndroid } from "react-native";
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function PassengerMainScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.75)).current;

  const [subareaOpen, setSubareaOpen] = useState(false);
  const [subareas, setSubareas] = useState<{ label: string; value: string }[]>(
    []
  );
  const [pickup, setPickup] = useState<
    { latitude: number; longitude: number; address?: string } | null
  >(null);
  const [drop, setDrop] = useState<
    { latitude: number; longitude: number; address?: string } | null
  >(null);
  const [subareaModalOpen, setSubareaModalOpen] = useState(false);
  const [subareaSearch, setSubareaSearch] = useState("");
  const [filteredSubareas, setFilteredSubareas] = useState<
    { label: string; value: string }[]
  >([]);
  const [manualMapMove, setManualMapMove] = useState(false);

  const VAN_REGION = {
    latitude: 12.6820,
    longitude: 78.6201,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const [mapRegion, setMapRegion] = useState({
    latitude: VAN_REGION.latitude,
    longitude: VAN_REGION.longitude,
    latitudeDelta: VAN_REGION.latitudeDelta,
    longitudeDelta: VAN_REGION.longitudeDelta,
  });

  // Camera center state (used to move camera)
  const [cameraCenter, setCameraCenter] = useState<[number, number]>([
    VAN_REGION.longitude,
    VAN_REGION.latitude,
  ]);
  const [cameraZoom, setCameraZoom] = useState(14);

  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [fare, setFare] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [adsTop, setAdsTop] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropAddress, setDropAddress] = useState<string>("");

  const LOCATIONIQ_KEY = "pk.6528e5690b2a09e0c624889317ee6965";

  // Ride booking state
  const [rideId, setRideId] = useState<string | null>(null);
  const [ride, setRide] = useState<any>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const [dropStreet, setDropStreet] = useState<string>("");
  const [dropSubarea, setDropSubarea] = useState<string>("");

  const [pendingRegion, setPendingRegion] = useState({
    latitude: VAN_REGION.latitude,
    longitude: VAN_REGION.longitude,
    latitudeDelta: VAN_REGION.latitudeDelta,
    longitudeDelta: VAN_REGION.longitudeDelta,
  });

  useEffect(() => {
    if (!subareaSearch.trim()) {
      setFilteredSubareas(subareas);
    } else {
      const filtered = subareas.filter((item) =>
        item.label.toLowerCase().includes(subareaSearch.toLowerCase())
      );
      setFilteredSubareas(filtered);
    }
  }, [subareaSearch, subareas]);

  useEffect(() => {
    if (countdown === 0) return;   // ⛔ ignore initial render

if (countdown <= 0 && rideId && ride?.status === "pending") {
  autoCancelIfNoDriver();
}
  }, [countdown, rideId, ride]);

  // --- Get current location ---
  useEffect(() => {
    getCurrentLocation();
    
    fetchAds();
    fetchSubareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
        
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      // 🔹 Polygon geocoder
      const areaName = getAreaName({ lat: latitude, lng: longitude }) || "Unknown Area";

      // 🔹 Nearest street / subarea
      const nearestStreet: StreetEntry | null = getNearestStreet(latitude, longitude);

      const streetName = nearestStreet?.name ?? "Unknown Street";

            setPickup({
        latitude,
        longitude,
        address: `${areaName} | ${streetName} Vaniyambadi, 635751`,
      });

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // set camera to current location
      setCameraCenter([longitude, latitude]);
      setCameraZoom(15);

      // --- DEBUG: log and send userLocation to webview to force passenger marker + zoom ---
      console.log("[RN] sending userLocation ->", { latitude, longitude, zoom: 17 });
      webRef.current?.postMessage(JSON.stringify({
        type: "userLocation",
        lat: latitude,
        lng: longitude,
        center: true,
        zoom: 17
      }));


useEffect
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // set camera to current location
      setCameraCenter([longitude, latitude]);
      setCameraZoom(15);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch route from LocationIQ ---
  const fetchRoute = async (dropLocation: { latitude: number; longitude: number }) => {
    if (!pickup) return;
    try {
      const url = `https://us1.locationiq.com/v1/directions/driving/${pickup.longitude},${pickup.latitude};${dropLocation.longitude},${dropLocation.latitude}?key=${LOCATIONIQ_KEY}&overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        routes?: Array<{
          geometry: { coordinates: number[][] };
          distance: number;
        }>;
      };

      if (data?.routes && data.routes.length > 0) {
        const points = data.routes[0].geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoords(points);
        const distKm = data.routes[0].distance / 1000;
        setDistance(distKm);
        setFare(Math.round(distKm * 45));
      }
    } catch (e) {
      console.error("Failed to fetch route from LocationIQ:", e);
    }
  };

const handleSelectSubarea = (subareaName: string) => {
  console.log("[RN] handleSelectSubarea:", subareaName);
  setDropSubarea(subareaName);

  const polygon = (polygons as Record<string, { lat: number; lng: number }[]>)[subareaName];
  if (!polygon) {
    console.warn("[RN] subarea polygon not found:", subareaName);
    return;
  }

  const center = getPolygonCenter(polygon);
  console.log("[RN] subarea center:", center);

  // Update pending drop & center marker (for Confirm Drop)
  setPendingDrop({ latitude: center.lat, longitude: center.lng });
  setPendingRegion({
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Update camera state (React Native side)
  setCameraCenter([center.lng, center.lat]);
  setCameraZoom(16);

  // Move Leaflet map in WebView
  const msg = { type: "setCamera", center: { lat: center.lat, lng: center.lng }, zoom: 16 };
  console.log("[RN -> WEBVIEW] setCamera:", msg);
  webRef.current?.postMessage(JSON.stringify(msg));
};




  // --- Fetch Ads / Subareas ---
  const fetchAds = async () => {
    const { data: ads, error } = await supabase
      .from("ads")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    if (ads?.length) setAdsTop([ads[0]]);
    else setAdsTop([{ title: "Your Ad Here!" }]);
  };

  const fetchSubareas = async () => {
    try {
      const { data, error } = await supabase
        .from("subareas")
        .select("name")
        .order("name", { ascending: true });
      if (error) {
        console.error("Failed to fetch subareas:", error);
        return;
      }
      const formatted = (data || []).map((s: any) => ({ label: s.name, value: s.name }));
      setSubareas(formatted);
      setFilteredSubareas(formatted);
    } catch (err) {
      console.error("Unexpected error fetching subareas:", err);
    }
  };

  // Drawer slide
  const toggleDrawer = () => {
    if (!drawerOpen) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: -SCREEN_WIDTH * 0.75,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    setDrawerOpen(!drawerOpen);
  };

  const [pendingDrop, setPendingDrop] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleConfirmDrop = async () => {
  // Instead of using pendingRegion from RN, ask the webview to confirm
  console.log("[RN] handleConfirmDrop -> asking webview to confirm center");
  try {
    webRef.current?.postMessage(JSON.stringify({ type: "confirm" }));
  } catch (e) {
    console.warn("[RN] failed to post confirm:", e);
  }
};




  const handleChangeDrop = () => {
    setConfirmed(false);
    setDrop(null);
    setRouteCoords([]);
    setDistance(null);
    setFare(null);
    setDropAddress("");
  };

  const handleBookRide = async () => {
    if (!pickup || !drop || !fare) {
      Alert.alert("Error", "Pickup, drop, or fare missing!");
      return;
    }

    if (!user) {
      Alert.alert("Login Required", "You need to be logged in to book a ride.");
      return;
    }

    const { data, error } = await supabase
      .from("rides")
      .insert([
        {
          passenger_id: user.id,
          pickup_lat: pickup.latitude,
          pickup_lng: pickup.longitude,
          pickup_address: pickup.address,
          drop_lat: drop.latitude,
          drop_lng: drop.longitude,
          drop_address: drop.address,
          fare_estimate: fare,
          drop_street: dropStreet,
          drop_subarea: dropSubarea,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Booking failed:", error);
      Alert.alert("Error", "Failed to book ride.");
      return;
    }

    setRideId(data.id);
    setRide(data);
    setConfirmed(true);

    // start 2 min countdown
    setCountdown(120);
    if (timerRef.current) clearInterval(timerRef.current as any);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as any);
          autoCancelIfNoDriver(); // auto cancel
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const autoCancelIfNoDriver = async () => {
    if (!rideId || !ride) return;

    if (ride.status === "pending") {
      console.log("⏳ Auto cancelling ride:", rideId);

      const { error } = await supabase
        .from("rides")
        .update({
          status: "cancelled",
          cancellation_reason: "No driver found",
        })
        .eq("id", rideId);

      if (error) {
        console.error("Auto cancel failed:", error);
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current as any);

      resetRideState();
      Alert.alert(
        "No Driver Found",
        "Sorry, no drivers accepted your ride in time 😔. Please try again!"
      );
    }
  };

  const handleCancelRide = async () => {
    if (!rideId) return;

    console.log("Cancelling ride:", rideId);

    const { error } = await supabase
      .from("rides")
      .update({
        status: "cancelled",
        cancellation_reason: "Cancelled by passenger",
      })
      .eq("id", rideId);

    if (error) {
      console.error("Cancel failed:", error);
      Alert.alert("Error", "Could not cancel ride.");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current as any);

    resetRideState();
    Alert.alert("Ride Cancelled", "You cancelled the ride.");
  };

  const resetRideState = () => {
    setRideId(null);
    setRide(null);
    setConfirmed(false);
    setDrop(null);
    setRouteCoords([]);
    setDistance(null);
    setFare(null);
    setCountdown(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current as any);
    };
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: signOut, style: "destructive" },
    ]);
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (drawerOpen) {
          toggleDrawer();
          return true;
        }
        Alert.alert("Logout", "Do you want to logout?", [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", onPress: handleLogout },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [drawerOpen])
  );

  // ride subscription updates
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel("ride_" + rideId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
  const newRide = payload.new;
  console.log("Ride updated:", newRide);

  // ❗ Ignore realtime updates while searching for driver
  if (newRide.status !== ride?.status) {
  console.log("Ride updated:", newRide);
}

setRide(newRide);

if (newRide.status === "accepted") {
  Alert.alert("Driver found!", "Your driver has accepted the ride.");
}
if (newRide.status === "arrived") {
  Alert.alert("Driver arrived!", "Please meet your driver.");
}
if (newRide.status === "in_progress") {
  Alert.alert("Ride Started", "Enjoy your trip.");
}
if (newRide.status === "completed") {
  Alert.alert("Ride Completed", "Thanks for riding!");
  setRideId(null);
}
if (newRide.status === "cancelled") {
  Alert.alert("Ride Cancelled", newRide.cancellation_reason || "Your ride was cancelled.");
  setRideId(null);
}

}

      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  const fullName =
    (user && "user_metadata" in user ? (user as any).user_metadata.full_name : null) ||
    user?.email ||
    "Guest";

  // Update drop by coords helper
  const updateDropByCoords = (lat: number, lng: number) => {
    const areaName = getAreaName({ lat, lng }) || "Unknown Area";
    setDropSubarea(areaName);
    const nearest = getNearestStreet(lat, lng);
    setDrop({
      latitude: lat,
      longitude: lng,
      address: `${nearest?.name || ""}, ${areaName}`,
    });
  };

  // WebView ref & message handling
  const webRef = useRef<any>(null);

  // Messages from WebView (map events)
  const handleWebMessage = async (event: any) => {
    
  // raw string from webview
  console.log("[WEBVIEW -> RN] raw:", event.nativeEvent?.data);

  try {
    const data = JSON.parse(event.nativeEvent.data);
    console.log("[WEBVIEW -> RN] parsed:", data);
        // Confirm returned from webview (map center snapped or not)
    if (data.type === "confirmDrop") {
      console.log("[WEBVIEW -> RN] confirmDrop:", data);
      const lat = data.lat;
      const lng = data.lng;
      try {
        // Reverse geocode using your existing LOCATIONIQ key
        const res = await fetch(
          `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
        );
        const rjson = await res.json();
        const address = rjson.display_name || "";

        const areaName = getAreaName({ lat, lng }) || "Unknown Area";

        setDrop({
          latitude: lat,
          longitude: lng,
          address: `${address}, ${areaName}`,
        });
        setDropSubarea(areaName);
        setConfirmed(true);

        console.log("[RN] confirmed drop (from webview) - fetching route now");
        await fetchRoute({ latitude: lat, longitude: lng });
        console.log("[RN] fetchRoute done - routeCoords length:", routeCoords?.length || "unknown (will log when updated)");
      } catch (e) {
        console.error("[RN] Confirm Drop (from webview) failed:", e);
        Alert.alert("Error", "Failed to confirm drop");
      }
      return;
    }

         if (data.type === "mapReady") {
      console.log("[WEBVIEW EVENT] mapReady received - sending subareas JSON now");
      const json = require("../data/all_subareas_updated.json");
      webRef.current?.postMessage(JSON.stringify({ type: "loadSubareas", data: json }));
      console.log("[RN -> WEBVIEW] loadSubareas posted (length):", Object.keys(json || {}).length);

      // If we already fetched pickup (current location), immediately send userLocation so map centers on passenger
      if (pickup && pickup.latitude && pickup.longitude) {
        console.log("[RN -> WEBVIEW] sending userLocation after mapReady ->", { latitude: pickup.latitude, longitude: pickup.longitude });
        webRef.current?.postMessage(JSON.stringify({
          type: "userLocation",
          lat: pickup.latitude,
          lng: pickup.longitude,
          center: true,
          zoom: 17
        }));
      }
      return;
    }

    if (data.type === "invalidArea") {
  console.log("User clicked outside allowed polygon");

  Alert.alert(
    "Outside Area",
    "Please select a location inside Vaniyambadi service area."
  );

  return; // stop further processing
}
    // map html loaded (custom)
    if (data.type === "mapReady") {
      console.log("[WEBVIEW EVENT] mapReady received - sending subareas JSON now");
      // adjust path if needed; make sure the JSON is included in the bundle
      const json = require("../data/all_subareas_updated.json");
      webRef.current?.postMessage(JSON.stringify({ type: "loadSubareas", data: json }));
      console.log("[RN -> WEBVIEW] loadSubareas posted (length):", Object.keys(json || {}).length);
      return;
    }
    if (data.type === "invalidArea") {
  ToastAndroid.show(
    "You cannot select outside service area",
    ToastAndroid.SHORT
  );
  return;
}

    // injectedReady wes the HTML we loaded executed injectedJavaScript
    if (data.type === "injectedReady") {
      console.log("[WEBVIEW EVENT] injectedReady", data);
      return;
    }

    // click / long press
    if (data.type === "press" || data.type === "longPress") {
      console.log(`[WEBVIEW EVENT] ${data.type} @`, data.lat, data.lng);
      setPendingDrop({ latitude: data.lat, longitude: data.lng });
      setPendingRegion({
        latitude: data.lat,
        longitude: data.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      // DO NOT set cameraCenter here (map should not jump)
      return;
    }

    // regionChange from webview (map center changed)
    if (data.type === "regionChange") {
      console.log("[WEBVIEW EVENT] regionChange center:", data.lat, data.lng);
      setPendingRegion(prev => ({ ...prev, latitude: data.lat, longitude: data.lng }));
      return;
    }

    // any other message
    console.log("[WEBVIEW EVENT] unhandled message", data);
  } catch (err) {
    console.warn("[WEBVIEW -> RN] parse error:", err);
  }
};




  // Send updates to webview whenever markers, route or camera changes
useEffect(() => {
  
  const payload = {
    
    type: "update",
    pickup,
    drop,
    pendingDrop,
    routeCoords,
    cameraCenter: { lng: cameraCenter[0], lat: cameraCenter[1] },
    cameraZoom,
    confirmed,
  };
  try {
    console.log("[RN -> WEBVIEW] posting update payload:", {
      pickup: !!pickup,
      drop: !!drop,
      pendingDrop: !!pendingDrop,
      routeCoordsLength: routeCoords?.length || 0,
      cameraCenter,
      cameraZoom,
      confirmed,
    });
    webRef.current?.postMessage(JSON.stringify(payload));
  } catch (e) {
    console.warn("[RN -> WEBVIEW] failed to post update:", e);
  }
}, [pickup, drop, pendingDrop, routeCoords, cameraCenter, cameraZoom, confirmed]);



  // When user selects a subarea we move camera — push a setCamera message
  useEffect(() => {
    // if cameraCenter changed programmatically, push setCamera to webview
    webRef.current?.postMessage(
      JSON.stringify({
        type: "setCamera",
        center: { lng: cameraCenter[0], lat: cameraCenter[1] },
        zoom: cameraZoom,
      })
    );
  }, [cameraCenter, cameraZoom]);

  // If user pressed my-location button we move to pickup
  const goToPickup = () => {
    if (pickup) {
      setCameraCenter([pickup.longitude, pickup.latitude]);
      setCameraZoom(15);
      webRef.current?.postMessage(JSON.stringify({ type: "setCamera", center: { lng: pickup.longitude, lat: pickup.latitude }, zoom: 15 }));
    }
  };

  // MapTiler key you gave
  const MAPTILER_KEY = "j4P0rHgATfxHhmuViQws";
const fixedHtml = createHtml(mapTilerKeyToUrl(MAPTILER_KEY));
  // If loading show spinner
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.locationBox}>
          <Ionicons name="location-sharp" size={20} color={theme.colors.primary} />
          <Text style={styles.locationText}>
            {pickup?.address ||
              (pickup
                ? `Lat: ${pickup.latitude.toFixed(4)}, Lon: ${pickup.longitude.toFixed(4)}`
                : "Locating...")}
          </Text>
        </View>
      </View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person-circle-outline" size={60} color="#ccc" />
          </View>
          <Text style={styles.drawerName}>{fullName}</Text>
        </View>
        <TouchableOpacity style={styles.drawerItem} onPress={() => router.push("/passenger/profile")}>
          <Text>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
          <Text>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem} onPress={() => router.push("/passenger/support")}>
          <Text>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>Rate Us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>About</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Overlay to close drawer */}
      {drawerOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleDrawer} />
      )}

      {/* Drop Input Section */}
      <View style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, zIndex: 5 }}>
        <TextInput
          style={styles.dropInput}
          placeholder="Street Address (optional)"
          value={dropStreet}
          onChangeText={setDropStreet}
          editable={!confirmed}
          selectTextOnFocus={!confirmed}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (confirmed) return;
            setSubareaSearch("");
            setFilteredSubareas(subareas);
            setSubareaModalOpen(true);
          }}
          style={[styles.dropInput, { justifyContent: "center", opacity: confirmed ? 0.5 : 1 }]}
        >
          <Text style={{ color: dropSubarea ? "#000" : "#888" }}>
            {dropSubarea ? dropSubarea : "Select Subarea (tap to search)"}
          </Text>
        </TouchableOpacity>

        {/* Subarea modal */}
        <Modal visible={subareaModalOpen} animationType="fade" transparent onRequestClose={() => setSubareaModalOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setSubareaModalOpen(false)}>
            <View style={modalStyles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={modalStyles.modalContainer}>
            <View style={modalStyles.modalCard}>
              <TextInput
                placeholder="Search subarea..."
                value={subareaSearch}
                onChangeText={setSubareaSearch}
                style={modalStyles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />

              <FlatList
                data={filteredSubareas}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 320 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.itemRow}
                    onPress={() => {
                      setDropSubarea(item.value);
                      setSubareaModalOpen(false);
                      handleSelectSubarea(item.value);
                      // also instruct webview to move camera
                      const polygon = (polygons as Record<string, { lat: number; lng: number }[]>)[item.value];
                      if (polygon) {
                        const center = getPolygonCenter(polygon);
                        webRef.current?.postMessage(JSON.stringify({
                          type: "setCamera",
                          center: { lng: center.lng, lat: center.lat },
                          zoom: 16
                        }));
                      }
                    }}
                  >
                    <Text>{item.label}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={modalStyles.itemRow}>
                    <Text style={{ color: "#888" }}>No results</Text>
                  </View>
                )}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>

      {/* Advertisement */}
      <AdvertisementBanner />

      {/* Map (WebView + MapTiler/Leaflet) */}
      <View style={styles.mapContainer}>
        <WebView
  ref={webRef}
  source={{ uri: "file:///android_asset/map.html" }}
  originWhitelist={['*']}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  allowFileAccess={true}
  allowUniversalAccessFromFileURLs={true}
  mixedContentMode="always"
  onMessage={handleWebMessage}
  injectedJavaScript={`
    // this runs inside the webview once. It posts back an "injectedReady" message so RN knows the exact HTML loaded.
    (function(){
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'injectedReady', time: Date.now() }));
      } catch(e){}
    })();
    true;
  `}
  style={{ flex: 1 }}
/>







        {/* Center dot for visual guide while selecting */}
        {!confirmed && (
          <View style={styles.centerMarker}>
            <View style={styles.centerLine} />
            <View style={styles.centerDot} />
          </View>
        )}
      </View>

      {/* Booking Card */}
      <View style={styles.bookingCard}>
        {!rideId ? (
          !confirmed ? (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleConfirmDrop}
            >
              <Text style={styles.mainButtonText}>Confirm Drop</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.info}>Distance: {distance?.toFixed(2)} km</Text>
              <Text style={styles.info}>Estimated Fare: ₹{fare}</Text>

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleBookRide}
              >
                <Text style={styles.mainButtonText}>Instant Book</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.changeButton} onPress={handleChangeDrop}>
                <Text style={styles.changeButtonText}>Change Drop</Text>
              </TouchableOpacity>
            </>
          )
        ) : ride?.status === "pending" ? (
          <>
            <Text style={styles.info}>Searching for a driver...</Text>
            <Text style={styles.info}>Time left: {countdown}s</Text>

            <TouchableOpacity style={[styles.mainButton, { backgroundColor: "red" }]} onPress={handleCancelRide}>
              <Text style={styles.mainButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </>
        ) : ride?.status === "accepted" || ride?.status === "arrived" || ride?.status === "in_progress" ? (
          <>
            <Text style={styles.info}>Ride Status: {ride.status}</Text>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push(`/passenger/ride-tracking?rideId=${rideId}`)}
            >
              <Text style={styles.mainButtonText}>View Ride Status</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {/* Bottom Navigation */}
      <PassengerBottomNav />
    </SafeAreaView>
  );
}

/* -------------------------- helpers & html generation ------------------------- */

function mapTilerKeyToUrl(key: string) {
  // Using MapTiler raster tiles endpoint (streets) — change style if you want
  return `https://api.maptiler.com/tiles/streets/{z}/{x}/{y}.png?key=${key}`;
}

function createHtml(tileUrl: string) {
  // returns full HTML string for the WebView (Leaflet)
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .leaflet-container { touch-action: pan-y pinch-zoom; -webkit-tap-highlight-color: transparent; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
      const tileUrl = "${tileUrl}";
      const map = L.map('map', { zoomControl: true }).setView([12.6820, 78.6201], 14);

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: -1,
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
      }).addTo(map);

      let pickupMarker = null;
      let dropMarker = null;
      let pendingMarker = null;
      let routeLine = null;

      function updateMarkers(payload) {
        const { pickup, drop, pendingDrop, routeCoords, cameraCenter, cameraZoom, confirmed } = payload;

        if (pickup) {
          if (!pickupMarker) {
            pickupMarker = L.marker([pickup.latitude, pickup.longitude], { title: "Pickup" }).addTo(map);
          } else {
            pickupMarker.setLatLng([pickup.latitude, pickup.longitude]);
          }
        } else if (pickupMarker) {
          map.removeLayer(pickupMarker);
          pickupMarker = null;
        }

        if (drop) {
          if (!dropMarker) {
            dropMarker = L.marker([drop.latitude, drop.longitude], { title: "Drop", icon: null }).addTo(map);
          } else {
            dropMarker.setLatLng([drop.latitude, drop.longitude]);
          }
        } else if (dropMarker) {
          map.removeLayer(dropMarker);
          dropMarker = null;
        }

        if (pendingDrop) {
          if (!pendingMarker) {
            pendingMarker = L.marker([pendingDrop.latitude, pendingDrop.longitude], { opacity: 0.9 }).addTo(map);
          } else {
            pendingMarker.setLatLng([pendingDrop.latitude, pendingDrop.longitude]);
          }
        } else if (pendingMarker) {
          map.removeLayer(pendingMarker);
          pendingMarker = null;
        }

        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }

        if (Array.isArray(routeCoords) && routeCoords.length > 1) {
          const latlngs = routeCoords.map(p => [p.latitude, p.longitude]);
          routeLine = L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);
        }

        // Move camera when requested
        if (cameraCenter) {
          try {
            const lat = cameraCenter.lat;
            const lng = cameraCenter.lng;
            if (typeof cameraZoom === 'number') {
              map.setView([lat, lng], cameraZoom);
            } else {
              map.setView([lat, lng]);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Notify RN about map region changes (debounced)
      let regionTimer = null;
      function notifyRegionChange() {
        if (regionTimer) clearTimeout(regionTimer);
        regionTimer = setTimeout(() => {
          const center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'regionChange',
            lat: center.lat,
            lng: center.lng
          }));
        }, 250);
      }
      map.on('moveend', notifyRegionChange);

      // Click & long press (contextmenu) events
      map.on('click', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'press',
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }));
      });

      map.on('contextmenu', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'longPress',
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }));
      });

      // Receive messages from React Native
      window.ReactNativeWebView.onMessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update') {
            updateMarkers(data);
          } else if (data.type === 'setCamera') {
            const center = data.center;
            const zoom = data.zoom;
            if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
              if (typeof zoom === 'number') map.setView([center.lat, center.lng], zoom);
              else map.setView([center.lat, center.lng]);
            }
          } else if (data.type === 'fitBounds' && data.bounds) {
            const b = data.bounds; // [[south,west],[north,east]]
            map.fitBounds([[b.south, b.west],[b.north,b.east]]);
          } else if (data.type === 'goToUser' && data.center) {
            map.setView([data.center.lat, data.center.lng], data.zoom || 15);
          }
        } catch (err) {
          // ignore parse errors
        }
      };

      // send initial ready event
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    </script>
  </body>
  </html>
  `;
}

/* ------------------------------- Styles --------------------------------- */

const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "20%",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight! + 8 : 16,
    backgroundColor: "white",
    elevation: 4,
    zIndex: 10,
  },
  locationBox: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locationText: { fontSize: 14, color: theme.colors.primary },
  overlay: {
    position: "absolute",
    top: 0,
    left: SCREEN_WIDTH * 0.75,
    width: SCREEN_WIDTH * 0.25,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 9,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: "white",
    elevation: 12,
    padding: theme.spacing.md,
    zIndex: 20,
  },
  drawerHeader: { alignItems: "center", marginBottom: 20 },
  profilePlaceholder: { marginBottom: 8 },
  drawerName: { fontWeight: "bold", fontSize: 16 },
  drawerItem: { paddingVertical: 12 },
  dropBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    margin: theme.spacing.md,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 1,
  },
  dropText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
    flexShrink: 1,
    flexWrap: "wrap",
  },

  searchInput: { flex: 1, height: 40, paddingHorizontal: 8 },
  adBox: { height: 60, backgroundColor: "#fcebcf", justifyContent: "center", alignItems: "center", marginHorizontal: theme.spacing.md, borderRadius: 8, marginVertical: 4 },
  adText: { fontWeight: "bold" },
  mapContainer: { flex: 1, marginHorizontal: theme.spacing.md, borderRadius: 8, overflow: "hidden" },
  map: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  markerView: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLine: {
    width: 2,
    height: 24,
    backgroundColor: "red",
    marginTop: -2,
  },
  centerDot: {
    width: 24,
    height: 24,
    backgroundColor: "red",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
    zIndex: 2,
  },
  bookingCard: { padding: theme.spacing.md, backgroundColor: "white", margin: theme.spacing.md, borderRadius: 12, elevation: 12, alignItems: "center" },
  mainButton: { width: "100%", paddingVertical: 14, borderRadius: theme.borderRadius.md, alignItems: "center", marginTop: 12 },
  mainButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  info: { fontSize: 16, marginBottom: 6, color: theme.colors.text },
  changeButton: { marginTop: 8, paddingVertical: 10 },
  changeButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: "600" },
  dropInputContainer: {
    margin: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 4,
  },
  dropInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },

  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
  },
});
