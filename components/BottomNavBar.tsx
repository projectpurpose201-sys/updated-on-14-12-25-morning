import React, { useMemo } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PassengerBottomNav = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Detect current route
  const currentRoute = `/${segments.join("/")}`;

  const tabs = useMemo(
    () => [
      {
        name: "Home",
        route: "/passenger",
        activeIcon: "home",
        inactiveIcon: "home-outline",
      },
      {
        name: "Book",
        route: "/passenger/book-ride",
        activeIcon: "car",
        inactiveIcon: "car-outline",
      },
      {
        name: "History",
        route: "/passenger/ride-history",
        activeIcon: "time",
        inactiveIcon: "time-outline",
      },
      {
        name: "Profile",
        route: "/passenger/profile",
        activeIcon: "person",
        inactiveIcon: "person-outline",
      },
    ],
    []
  );

  const activeColor = "#1e90ff";

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab, index) => {
        const isActive = currentRoute === tab.route;

        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.8} // smoother press effect
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.inactiveIcon}
              size={26}
              color={isActive ? activeColor : "#808080"}
            />
            <Text
              style={{
                color: isActive ? activeColor : "#808080",
                fontSize: 12,
                marginTop: 3,
                fontWeight: isActive ? "600" : "500",
              }}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 0.7,
    borderTopColor: "#ddd",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(PassengerBottomNav);
