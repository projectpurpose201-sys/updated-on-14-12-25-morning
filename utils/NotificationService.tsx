import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase"; // adjust path to your supabase client

// Request permission and get Expo token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    alert("Must use physical device for Push Notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Permission not granted for notifications");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// Save token to Supabase
export async function savePushTokenToSupabase(userId: string, token: string) {
  try {
    // Step 1: remove this token from any other user (safety)
    await supabase.from("profiles")
      .update({ expo_push_token: null })
      .eq("expo_push_token", token);

    // Step 2: save the new token for current user
    await supabase.from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId);

    console.log("✅ Expo push token saved successfully:", token);
  } catch (error) {
    console.error("❌ Error saving push token:", error);
  }
}

// Remove token (on logout)
export async function clearPushToken(userId: string) {
  try {
    await supabase.from("profiles")
      .update({ expo_push_token: null })
      .eq("id", userId);

    console.log("🧹 Token cleared for user:", userId);
  } catch (error) {
    console.error("❌ Error clearing token:", error);
  }
}
