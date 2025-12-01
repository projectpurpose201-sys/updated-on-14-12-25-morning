import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleRoleSelect = (role: 'passenger' | 'driver') => {
    router.push({ pathname: '/auth/sign-up', params: { role } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <View style={styles.content}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>
              Select how you want to use the app
            </Text>
          </View>

          {/* Role Cards */}
          <View style={styles.cardsWrapper}>
            
            {/* Passenger */}
            <Card style={styles.roleCard}>
              <View style={styles.cardContent}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person" size={42} color="#fff" />
                </View>

                <Text style={styles.cardTitle}>Passenger</Text>
                <Text style={styles.cardDescription}>
                  Book auto rides quickly and easily
                </Text>

                <Button
                  title="Continue as Passenger"
                  onPress={() => handleRoleSelect('passenger')}
                  variant="primary"
                  style={styles.button}
                />
              </View>
            </Card>

            {/* Driver */}
            <Card style={styles.roleCard}>
              <View style={styles.cardContent}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondary }]}>
                  <Ionicons name="car" size={42} color="#fff" />
                </View>

                <Text style={styles.cardTitle}>Driver</Text>
                <Text style={styles.cardDescription}>
                  Accept rides and earn money
                </Text>

                <Button
                  title="Continue as Driver"
                  onPress={() => handleRoleSelect('driver')}
                  variant="secondary"
                  style={styles.button}
                />
              </View>
            </Card>

          </View>

          {/* Back */}
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="ghost"
            textStyle={{ color: '#fff' }}
            style={{ marginBottom: 30 }}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  // Cards
  cardsWrapper: { gap: 18 },
  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  cardContent: {
    alignItems: 'center',
    gap: 12,
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  button: { width: '100%', marginTop: 10 },
});
