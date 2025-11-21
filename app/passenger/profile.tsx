import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../../contexts/AuthContext";
import { theme } from "../../utils/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: signOut, style: "destructive" },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Info Card */}
        <Card style={styles.profileCard}>
          <Ionicons
            name="person-circle-outline"
            size={90}
            color={theme.colors.primary}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.name || "Driver Name"}</Text>
          <Text style={styles.email}>{user?.email || "driver@email.com"}</Text>
        </Card>

        {/* Buttons */}
        <Button
          title="Ride History"
          onPress={() => router.push("../passenger/ride-history")}
          variant="outline"
          style={styles.menuButton}
        />

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  profileCard: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    width: "100%",
  },
  avatar: {
    marginBottom: theme.spacing.md,
  },
  name: {
    ...theme.typography.heading2,
    color: theme.colors.text,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  menuButton: {
    width: "100%",
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    width: "100%",
    backgroundColor: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
});
