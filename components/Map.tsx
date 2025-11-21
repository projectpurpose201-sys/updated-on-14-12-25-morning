import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

interface MapProps {
  pickup: { latitude: number; longitude: number; address?: string } | null;
  drop: { latitude: number; longitude: number } | null;
  routeCoords: { latitude: number; longitude: number }[];
  onLongPress?: (e: any) => void;
}

const VAN_REGION = {
  latitude: 12.6820,
  longitude: 78.6201,
};

const BOUNDS = {
  north: 12.75,
  south: 12.62,
  east: 78.68,
  west: 78.55,
};

export default function Map({ pickup, drop, routeCoords, onLongPress }: MapProps) {
  const webRef = useRef<WebView>(null);

  // Handle messages from WebView
  const onMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);

    if (data.type === "longPress") {
      onLongPress &&
        onLongPress({
          latitude: data.lat,
          longitude: data.lng,
        });
    }
  };

  // Send updated markers & route to WebView
  useEffect(() => {
    const payload = {
      type: "update",
      pickup,
      drop,
      routeCoords,
    };

    webRef.current?.postMessage(JSON.stringify(payload));
  }, [pickup, drop, routeCoords]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
        source={{
          html: htmlContent,
        }}
      />

      {/* My Location Button */}
      <TouchableOpacity style={styles.locationButton} onPress={() => {
        webRef.current?.postMessage(JSON.stringify({ type: "goToUser" }));
      }}>
        <Ionicons name="locate" size={22} color="black" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  locationButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
  },
});

// -------------------- HTML OSM MAP (Leaflet) ------------------------

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <style>
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  #map {
    height: 100vh;
    width: 100%;
  }

  .center-marker {
    position: absolute;
    top: 50%; left: 50%;
    width: 20px; height: 20px;
    background: red;
    border: 2px solid white;
    border-radius: 10px;
    margin-left: -10px;
    margin-top: -10px;
    z-index: 9999;
  }
</style>

</head>

<body>
<div id="map"></div>
<div class="center-marker"></div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<script>
  var map;

  function initMap() {
    map = L.map('map').setView([12.6820, 78.6201], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    // 🔥 FIX: invalidateSize only after map is fully ready
    map.whenReady(() => {
      setTimeout(() => {
        map.invalidateSize(true);
      }, 300);
    });

    setupEvents();
  }

  function setupEvents() {
    let pickupMarker = null;
    let dropMarker = null;
    let routeLine = null;

    function updateMarkers(payload) {
      const { pickup, drop, routeCoords } = payload;

      if (pickup) {
        if (!pickupMarker)
          pickupMarker = L.marker([pickup.latitude, pickup.longitude]).addTo(map);
        else
          pickupMarker.setLatLng([pickup.latitude, pickup.longitude]);
      }

      if (drop) {
        if (!dropMarker)
          dropMarker = L.marker([drop.latitude, drop.longitude]).addTo(map);
        else
          dropMarker.setLatLng([drop.latitude, drop.longitude]);
      }

      if (routeLine) map.removeLayer(routeLine);

      if (routeCoords && routeCoords.length > 1) {
        routeLine = L.polyline(
          routeCoords.map(p => [p.latitude, p.longitude]),
          { color: "blue", weight: 4 }
        ).addTo(map);
      }
    }

    map.on("contextmenu", function (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "longPress",
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    });

    window.ReactNativeWebView.onMessage = function (event) {
      const data = JSON.parse(event.data);

      if (data.type === "update") updateMarkers(data);
      if (data.type === "goToUser") map.setView([12.6820, 78.6201], 15);
    };
  }

  document.addEventListener("DOMContentLoaded", initMap);
</script>


</body>
</html>
`;
