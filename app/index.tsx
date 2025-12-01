import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { LinearGradient } from "expo-linear-gradient";

const TEXT = " Let's go  ";
const BLUE = "#1976D2"; // single BLUE constant

const WelcomeScreen: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [textWidth, setTextWidth] = useState<number>(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "passenger") router.replace("/passenger");
      else if (user.role === "driver") router.replace("/driver");
    }
  }, [user, loading]);

  useEffect(() => {
    if (textWidth <= 0) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [textWidth]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, textWidth],
  });

  const onTextLayout = (e: LayoutChangeEvent) => {
    const width = Math.ceil(e.nativeEvent.layout.width);
    if (width && width !== textWidth) setTextWidth(width);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={[BLUE, BLUE]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.center}>
          <View style={styles.textWrapper}>
            <Text
              style={styles.letsGoText}
              onLayout={onTextLayout}
              numberOfLines={1}
            >
              {TEXT}
            </Text>

            {textWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.mask,
                  {
                    width: textWidth,
                    transform: [{ translateX }],
                  },
                ]}
              />
            )}

            {textWidth > 0 && (
              <Animated.View
                style={[styles.cursorWrapper, { transform: [{ translateX }] }]}
              >
                <LinearGradient
                  colors={["#00FF99", "#00CC66"]} // GREEN CURSOR
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cursor}
                />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/auth/role-selection")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/auth/sign-in")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  textWrapper: {
    position: "relative",
    height: 72,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 8,
  },

  letsGoText: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 60,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  mask: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: BLUE, // exact match to page background
  },

  cursorWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  cursor: {
    width: 6,
    height: 50,
    borderRadius: 4,
    elevation: 6,
  },

  bottomContainer: {
    backgroundColor: "#000",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },

  primaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 14,
  },

  primaryText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "700",
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },

  secondaryText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },

  loadingText: {
    color: "#fff",
    fontSize: 18,
  },
});
