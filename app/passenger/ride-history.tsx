import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSession } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { theme } from "../../utils/theme";
import { Ride } from "../../types";
import { format } from "date-fns";
import PassengerBottomNav from "../../components/BottomNavBar"; 

export default function RideHistoryScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "cancelled">(
    "all"
  );

  useEffect(() => {
    const fetchRides = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("rides")
          .select("*")
          .eq("passenger_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRides(data as Ride[]);
      } catch (error) {
        console.error("Error fetching ride history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [user]);

  const getStatusColor = (status: Ride["status"]) => {
    switch (status) {
      case "completed":
        return theme.colors.success;
      case "cancelled":
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getFirstWord = (address: string) => {
    if (!address) return "—";
    const clean = address.trim().split(/[ ,]+/)[0];
    return clean;
  };

  const filteredRides =
    filterStatus === "all"
      ? rides
      : rides.filter((r) => r.status === filterStatus);

  const completedCount = rides.filter((r) => r.status === "completed").length;
  const cancelledCount = rides.filter((r) => r.status === "cancelled").length;

  const renderItem = ({ item }: { item: Ride }) => {
    const isExpanded = expandedId === item.id;
    const date = item.created_at
      ? format(new Date(item.created_at), "MMM dd, yyyy - p")
      : "N/A";
    const fare = item.fare_final ?? item.fare_estimate ?? "—";
    const statusIcon =
      item.status === "completed"
        ? "checkmark-circle"
        : item.status === "cancelled"
        ? "close-circle"
        : "time-outline";

    return (
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedId(isExpanded ? null : item.id);
        }}
        style={styles.cardWrapper}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{date}</Text>
          <Ionicons
            name={statusIcon}
            size={20}
            color={getStatusColor(item.status)}
          />
        </View>

        <View style={styles.routeRow}>
          <Text style={styles.routeText}>
            {getFirstWord(item.pickup_address)} → {getFirstWord(item.drop_address)}
          </Text>
          <Text style={styles.fareText}>₹{fare}</Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>From: </Text>
              {item.pickup_address}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>To: </Text>
              {item.drop_address}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>Fare: </Text>₹{fare}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>Time: </Text>
              {date}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>Driver: </Text>
              {item.driver_name || "N/A"}
            </Text>
            <Text
              style={[
                styles.detailText,
                { color: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.bold}>Status: </Text>
              {item.status}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ flex: 1 }}
        />
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No rides yet.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryBox}>
            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() =>
                setFilterStatus(filterStatus === "completed" ? "all" : "completed")
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.summaryText}>
                Completed: {completedCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() =>
                setFilterStatus(filterStatus === "cancelled" ? "all" : "cancelled")
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.error}
              />
              <Text style={styles.summaryText}>Cancelled: {cancelledCount}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredRides}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* PASSENGER BOTTOM NAV */}
      <PassengerBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: theme.spacing.sm,
    backgroundColor: "#fff",
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  cardWrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dateText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeText: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
    marginRight: 10,
  },
  fareText: {
    ...theme.typography.heading3,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  expandedContent: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  detailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginVertical: 2,
  },
  bold: {
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...theme.typography.heading3,
    color: theme.colors.textSecondary,
  },
});
