import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../../contexts/AuthContext";
import { theme } from "../../utils/theme";
import { Card } from "../../components/ui/Card";
import { Ionicons } from "@expo/vector-icons";
import PassengerBottomNav from "../../components/BottomNavBar";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
    setModalVisible(false);
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.logoutIconButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROFILE CARD */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name || "User")}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          </View>
          
          <Text style={styles.name}>{user?.name || "Passenger Name"}</Text>
          <Text style={styles.email}>{user?.email || "user@email.com"}</Text>
        </Card>

        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <PassengerBottomNav />

      {/* LOGOUT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="log-out-outline" size={40} color={theme.colors.error} style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#333", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                onPress={handleLogout}
                disabled={isLoading}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {isLoading ? "Signing out..." : "Logout"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  headerTitle: { ...theme.typography.heading1, color: theme.colors.text, fontSize: 24, fontWeight: "700" },
  logoutIconButton: { padding: 8, borderRadius: 12, backgroundColor: `${theme.colors.error}08` },

  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 100 },
  profileCard: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: { position: "relative", marginBottom: theme.spacing.md },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primary,
    justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: `${theme.colors.primary}20`,
  },
  avatarText: { color: "white", fontSize: 32, fontWeight: "bold" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "white", borderRadius: 10, padding: 2 },
  name: { ...theme.typography.heading1, color: theme.colors.text, fontSize: 24, fontWeight: "700", marginBottom: theme.spacing.xs, textAlign: "center" },
  email: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, textAlign: "center" },

  versionText: { 
  ...theme.typography.caption, 
  color: "#888", // grey color
  textAlign: "center", 
  marginBottom: theme.spacing.xl 
},

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text },
  modalMessage: { fontSize: 14, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, marginHorizontal: 5, justifyContent: "center", alignItems: "center" },
});
