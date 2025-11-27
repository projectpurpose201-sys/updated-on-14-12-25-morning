import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../utils/theme";
import { supabase } from "../../lib/supabase";
import PassengerBottomNav from "../../components/BottomNavBar";
import { Card } from "../../components/ui/Card";

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  const [loading, setLoading] = useState(true);
  const [totalRides, setTotalRides] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      const driverId = user?.id;
      if (!driverId) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", driverId)
        .single();
      setProfile(profileData || {});

      // Fetch total rides
      const { count } = await supabase
        .from("rides")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driverId);
      setTotalRides(count || 0);

      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from("rides")
        .select("fare_estimate")
        .eq("driver_id", driverId);
      let total = 0;
      earningsData?.forEach((item) => {
        if (item?.fare_estimate) total += item.fare_estimate;
      });
      setTotalEarnings(total);
    } catch (err) {
      console.log("Stats ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  const handleLogout = () => {
    // Professional style alert can be implemented with modal if needed
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />

      {/* HEADER */}
<View style={styles.header}>
  <Text style={styles.headerTitle}>Driver Profile</Text>
  <TouchableOpacity
    style={styles.settingsButton}
    onPress={() => router.push("/passenger/support")} // Navigate to Contact Us page
  >
    <Ionicons name="mail-outline" size={24} color={theme.colors.text} />
  </TouchableOpacity>
</View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE CARD */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile?.name || user?.name || "U")}</Text>
              </View>
            </View>
            <Text style={styles.name}>{profile?.name || user?.name}</Text>
            <Text style={styles.email}>{profile?.email || user?.email}</Text>
            {profile?.phone && <Text style={styles.extra}>📞 {profile.phone}</Text>}
          </Card>

          {/* STATS */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="car-sport-outline" size={28} color={theme.colors.primary} />
              <Text style={styles.statValue}>{totalRides}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={28} color="#f4c430" />
              <Text style={styles.statValue}>{profile?.rating_avg || "4.9"}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={28} color={theme.colors.success} />
              <Text style={styles.statValue}>₹{totalEarnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </View>

          {/* LOGOUT */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* BOTTOM NAV */}
      <PassengerBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  settingsButton: { padding: 8, borderRadius: 12, backgroundColor: `${theme.colors.text}08` },

  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },

  scrollContent: { paddingBottom: 100, paddingHorizontal: 20 },

  profileCard: {
    backgroundColor: "#fff",
    paddingVertical: 25,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  avatarContainer: { marginBottom: 15 },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: `${theme.colors.primary}20`,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: theme.colors.text, marginTop: 10 },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  extra: { fontSize: 14, color: theme.colors.text, marginTop: 2 },

  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  statCard: {
    flex: 1, backgroundColor: "#fff", marginHorizontal: 5, paddingVertical: 15, borderRadius: 14,
    alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 6, color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },

  logoutButton: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    backgroundColor: theme.colors.error, paddingVertical: 13, borderRadius: 12,
    marginBottom: 20,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 },
});
