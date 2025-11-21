// components/PassengerBottomNav.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PassengerBottomNav = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <TouchableOpacity style={styles.tab} onPress={() => router.push("/passenger")}>
        <Ionicons name="home-outline" size={24} color="#000" />
        <Text>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => router.push("/passenger/book-ride")}>
        <Ionicons name="car-outline" size={24} color="#000" />
        <Text>Book</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => router.push("/passenger/ride-history")}>
        <Ionicons name="time-outline" size={24} color="#000" />
        <Text>History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => router.push("/passenger/profile")}>
        <Ionicons name="person-outline" size={24} color="#000" />
        <Text>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PassengerBottomNav;
