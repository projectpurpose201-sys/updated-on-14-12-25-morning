// components/driver/RideRequests.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Card } from "../../components/ui/Card";
import { supabase } from "../../lib/supabase";
import { calculateDistanceFromFare } from "../../utils/fare"; // Import your function

type Ride = {
  id: string;
  passenger_id: string;
  pickup_address: string;
  drop_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  distance_km?: number;
  fare_estimate: number;
};

type RideWithName = Ride & { 
  passenger_name: string;
  calculated_distance?: number;
};

type Props = {
  rides: Ride[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export default function RideRequests({ rides, onAccept, onReject }: Props) {
  const [ridesWithNames, setRidesWithNames] = useState<RideWithName[]>([]);

  useEffect(() => {
    const fetchPassengerNamesAndCalculateDistance = async () => {
      const newRides: RideWithName[] = await Promise.all(
        rides.map(async (ride) => {
          // Fetch passenger name
          const { data: passengerData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", ride.passenger_id)
            .single();

          // 🎯 CALCULATE DISTANCE FROM FARE
          let calculatedDistance = ride.distance_km;
          
          // If distance_km is not provided, calculate from fare
          if (!calculatedDistance && ride.fare_estimate) {
            calculatedDistance = calculateDistanceFromFare(ride.fare_estimate);
          }

          return {
            ...ride,
            passenger_name: passengerData?.name || "Passenger",
            calculated_distance: calculatedDistance,
          };
        })
      );
      setRidesWithNames(newRides);
    };

    if (rides.length > 0) fetchPassengerNamesAndCalculateDistance();
  }, [rides]);

  const getFirstWord = (address: string) => {
    if (!address) return "—";
    return address.trim().split(/[ ,]+/)[0];
  };

  const getLastWord = (address: string) => {
    if (!address) return "—";
    const words = address.trim().split(/[ ,]+/);
    return words[words.length - 1];
  };

  if (rides.length === 0) return null;

  return (
    <FlatList
      data={ridesWithNames}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          {/* Passenger + Fare */}
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{item.passenger_name}</Text>
            <Text style={styles.fare}>₹{item.fare_estimate}</Text>
          </View>

          {/* Pickup → Drop + KM */}
          <View style={styles.rowBetween}>
            <Text style={styles.route}>
              {getFirstWord(item.pickup_address)} → {getLastWord(item.drop_address)}
            </Text>
            {/* 🎯 DISPLAY CALCULATED DISTANCE */}
            <Text style={styles.km}>
              {item.calculated_distance ? item.calculated_distance.toFixed(1) : "0"} km
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={() => onAccept(item.id)}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn]}
              onPress={() => onReject(item.id)}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    />
  );
}

// ... keep your existing styles the same
const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  fare: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2e7d32",
  },
  route: {
    fontSize: 13,
    color: "#555",
    maxWidth: "70%",
  },
  km: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptBtn: { backgroundColor: "#4caf50" },
  rejectBtn: { backgroundColor: "#e53935" },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
