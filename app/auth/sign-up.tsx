import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, '')))
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (!acceptedPolicy)
      newErrors.acceptedPolicy = 'You must accept the Privacy Policy and Terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        role,
      });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      Alert.alert('Success', 'Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.push('/auth/sign-in') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Sign Up as {role === 'passenger' ? 'Passenger' : 'Driver'}</Text>
            <Text style={styles.subtitle}>Create your account to get started</Text>

            <Card style={styles.formCard}>
              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                error={errors.name}
                leftIcon="person"
                placeholder="Enter your full name"
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                error={errors.phone}
                leftIcon="call"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

              <Input
                label="Email Address"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                error={errors.email}
                leftIcon="mail"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                error={errors.password}
                leftIcon="lock-closed"
                placeholder="Create a strong password"
                secureTextEntry
              />

              <Input
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                error={errors.confirmPassword}
                leftIcon="lock-closed"
                placeholder="Confirm your password"
                secureTextEntry
              />

              {/* ✅ Privacy Policy & Terms Checkbox with Tick */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedPolicy(!acceptedPolicy)}
              >
                <View style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}>
                  {acceptedPolicy && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL(
                        'https://docs.google.com/document/d/e/2PACX-1vS1wHK9uZ0VkHuDOb25FXrtIO9T318OfeVi0RXh27_8_g4QEhAIKpW5LSEp0zocUErqIMWW9WfsJDzm/pub'
                      )
                    }
                  >
                    Privacy Policy & Terms of Service
                  </Text>
                </Text>
              </TouchableOpacity>
              {errors.acceptedPolicy && <Text style={styles.errorText}>{errors.acceptedPolicy}</Text>}

              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                style={styles.signUpButton}
                disabled={!acceptedPolicy} // Prevent signup until checked
              />

              <Button
                title="Already have an account? Sign In"
                onPress={() => router.push('/auth/sign-in')}
                variant="ghost"
                style={styles.signInButton}
              />

              {role === 'passenger' && (
                <Button
                  title="Continue as Driver →"
                  onPress={() => router.push('/auth/sign-up?role=driver')}
                  variant="ghost"
                  style={styles.continueButton}
                />
              )}
            </Card>

            <Button
              title="← Back"
              onPress={() => router.back()}
              variant="ghost"
              style={styles.backButton}
              textStyle={styles.backText}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    ...theme.typography.heading2,
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  signUpButton: { marginTop: theme.spacing.md },
  signInButton: { marginTop: theme.spacing.sm },
  continueButton: { marginTop: theme.spacing.md },
  backButton: { alignSelf: 'flex-start', marginTop: theme.spacing.md },
  backText: { color: '#fff' },

  // ✅ Checkbox styles
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkboxText: { flex: 1, flexWrap: 'wrap' },
  linkText: { color: theme.colors.primary, textDecorationLine: 'underline' },
  errorText: { color: 'red', marginTop: 5 },
});
