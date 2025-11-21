import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Linking from "expo-linking";

export default function Support() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!email.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in both email and message.");
      return;
    }

    const subject = encodeURIComponent("Support Request");
    const body = encodeURIComponent(`From: ${email}\n\nMessage:\n${message}`);
    const mailUrl = `mailto:m68284428@gmail.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailUrl).catch(() => {
      Alert.alert("Error", "Unable to open mail app.");
    });
  };

  return (
    <LinearGradient
      colors={["#4A90E2", "#50C9C3"]}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View
            entering={FadeInDown.duration(600).springify()}
            style={styles.card}
          >
            <Text style={styles.title}>💬 Support Center</Text>
            <Text style={styles.subtitle}>
              We’re here to help you. Please describe your issue or question.
            </Text>

            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <TextInput
                style={styles.input}
                placeholder="Your Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <TextInput
                style={[styles.input, styles.messageBox]}
                placeholder="Write your message..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                multiline
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(500)}>
              <TouchableOpacity onPress={handleSend} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#007AFF", "#00C6FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Send Message</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  messageBox: {
    height: 120,
    textAlignVertical: "top",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
