import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { Lato_400Regular, Lato_700Bold } from "@expo-google-fonts/lato";
import { SessionProvider, useSession } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { theme } from "../utils/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// ✅ 1. Notification config
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // New fields for iOS 17 / Expo SDK 51+
    shouldShowAlert: true, // works for Android
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // required on iOS
    shouldShowList: true,   // required on iOS
  }),
});

const InitialLayout = () => {
  const { session, loading, user } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // ✅ 2. Listen for notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log("📩 Notification received:", notification);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (session && user) {
      const targetPath = user.role === "driver" ? "/driver" : "/passenger";
      if (segments[0] !== user.role) {
        router.replace(targetPath);
      }
    } else if (!session && !inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, user, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SessionProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <InitialLayout />
      </SafeAreaProvider>
    </SessionProvider>
  );
}
