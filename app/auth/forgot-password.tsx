import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const { error } = await resetPassword(email);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Reset Link Sent',
        'Please check your email to reset your password.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Text>
            </View>

            {/* Form Card */}
            <Card style={styles.formCard}>
              <Input
                label="Email"
                leftIcon="mail"
                value={email}
                onChangeText={updateEmail}
                placeholder="example@mail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
              />

              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.resetButton}
              />

              <Button
                title="Back to Sign In"
                onPress={() => router.back()}
                variant="ghost"
                style={styles.backToSignIn}
              />
            </Card>

            {/* Back Button */}
            <Button
              title="← Back"
              onPress={() => router.back()}
              variant="ghost"
              textStyle={styles.backText}
              style={{ marginTop: 10 }}
            />

          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },

  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl * 2,
    paddingBottom: theme.spacing.xl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Form Card
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 15,
  },

  resetButton: {
    marginTop: 18,
  },
  backToSignIn: {
    marginTop: 10,
  },

  backText: {
    color: '#fff',
  },
});
