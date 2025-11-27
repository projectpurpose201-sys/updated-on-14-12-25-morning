// --- SAME IMPORTS ---
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function SignUpScreen() {
  const router = useRouter();
  const { role: routeRole } = useLocalSearchParams<{ role?: 'passenger' | 'driver' }>();
  const role = routeRole || 'passenger';

  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  // ---------------- VALIDATION (unchanged) ----------------
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, "")))
      newErrors.phone = "Enter valid 10-digit phone";

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Enter valid email";

    if (!formData.password) newErrors.password = "Password required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be 6+ chars";

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!acceptedPolicy)
      newErrors.acceptedPolicy = "You must agree to continue";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ---------------- SIGN UP (unchanged) ----------------
  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        role,
      });

      if (error) return Alert.alert("Error", error.message);

      Alert.alert(
        "Success",
        "Check your email to verify your account.",
        [{ text: "OK", onPress: () => router.push("/auth/sign-in") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  // ===================== NEW UI DESIGN ========================
  // ===========================================================

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* HEADER */}
            <View style={styles.headerBox}>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Sign up as {role === "passenger" ? "Passenger" : "Driver"}
              </Text>
            </View>

            {/* WHITE CARD */}
            <View style={styles.formCard}>
              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(v) => updateFormData("name", v)}
                placeholder="John Doe"
                leftIcon="person"
                error={errors.name}
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChangeText={(v) => updateFormData("phone", v)}
                placeholder="9876543210"
                keyboardType="phone-pad"
                leftIcon="call"
                error={errors.phone}
              />

              <Input
                label="Email"
                value={formData.email}
                onChangeText={(v) => updateFormData("email", v)}
                placeholder="email@example.com"
                keyboardType="email-address"
                leftIcon="mail"
                autoCapitalize="none"
                error={errors.email}
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(v) => updateFormData("password", v)}
                placeholder="Create password"
                secureTextEntry
                leftIcon="lock-closed"
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(v) => updateFormData("confirmPassword", v)}
                placeholder="Re-enter password"
                secureTextEntry
                leftIcon="lock-closed"
                error={errors.confirmPassword}
              />

              {/* TERMS CHECKBOX */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedPolicy(!acceptedPolicy)}
              >
                <View style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}>
                  {acceptedPolicy && <Text style={styles.checkMark}>✓</Text>}
                </View>

                <Text style={styles.policyText}>
                  I agree to the{" "}
                  <Text
                    style={styles.link}
                    onPress={() =>
                      Linking.openURL(
                        "https://docs.google.com/document/d/e/2PACX-1vS1wHK9uZ0VkHuDOb25FXrtIO9T318OfeVi0RXh27_8_g4QEhAIKpW5LSEp0zocUErqIMWW9WfsJDzm/pub"
                      )
                    }
                  >
                    Privacy Policy & Terms
                  </Text>
                </Text>
              </TouchableOpacity>

              {errors.acceptedPolicy && (
                <Text style={styles.errorText}>{errors.acceptedPolicy}</Text>
              )}

              {/* BUTTONS */}
              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                disabled={!acceptedPolicy}
                style={{ marginTop: 20 }}
              />

              <Button
                title="Already have an account?"
                variant="ghost"
                onPress={() => router.push('/auth/sign-in')}
                style={{ marginTop: 10 }}
              />

              {role === "passenger" && (
                <Button
                  title="Continue as Driver →"
                  variant="ghost"
                  onPress={() => router.push("/auth/sign-up?role=driver")}
                  style={{ marginTop: 4 }}
                />
              )}
            </View>

            <Button
              title="← Back"
              variant="ghost"
              onPress={() => router.back()}
              textStyle={{ color: "#fff" }}
              style={{ marginTop: 15 }}
            />

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ======================== NEW STYLES =========================

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  headerBox: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },

  formCard: {
    width: "100%",
    padding: 20,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    elevation: 4,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  checkMark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  policyText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
    flexWrap: "wrap",
  },

  link: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },

  errorText: {
    color: "red",
    marginTop: 5,
  },
});
