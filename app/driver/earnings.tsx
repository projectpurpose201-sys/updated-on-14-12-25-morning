import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../utils/theme';
import { Card } from '../../components/ui/Card';
import { format } from 'date-fns';

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // 1) Fetch rides for this driver
        const { data: ridesData, error: ridesError } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .order('created_at', { ascending: false });

        if (ridesError) throw ridesError;
        const rideList = ridesData || [];

        // 2) Gather passenger IDs (unique, non-null)
        const passengerIds = Array.from(
          new Set(rideList.map((r) => r.passenger_id).filter(Boolean))
        );

        // 3) Fetch passenger names from profiles (column: name)
        let passengerMap = {};
        if (passengerIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', passengerIds);

          if (profilesError) throw profilesError;

          (profilesData || []).forEach((p) => {
            passengerMap[p.id] = p.name || 'Unknown';
          });
        }

        // 4) Merge passenger_name into rides
        const merged = rideList.map((r) => ({
          ...r,
          passenger_name: passengerMap[r.passenger_id] || 'Unknown',
        }));

        // 5) Compute total earnings (use fallback fields)
        let total = 0;
        merged.forEach((r) => {
          const val =
            Number(r.fare) ||
            Number(r.fare_estimate) ||
            Number(r.fare_final) ||
            0;
          total += val;
        });

        if (!isMounted) return;
        setRides(merged);
        setTotalEarnings(total);
      } catch (err) {
        console.error('EarningsScreen fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getFirstWord = (address) => {
    if (!address) return '—';
    return address.trim().split(/[ ,]+/)[0];
  };

  const renderRide = ({ item }) => {
    const isExpanded = expandedId === item.id;

    const date = item.created_at
      ? format(new Date(item.created_at), 'MMM dd, yyyy • hh:mm a')
      : 'N/A';

    const fare =
      item.fare ?? item.fare_estimate ?? item.fare_final ?? '—';

    return (
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedId(isExpanded ? null : item.id);
        }}
        style={styles.rideCard}
        activeOpacity={0.9}
      >
        {/* TOP ROW */}
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{date}</Text>
          <Ionicons
            name={
              item.status === 'completed'
                ? 'checkmark-circle'
                : item.status === 'cancelled'
                ? 'close-circle'
                : 'time-outline'
            }
            size={20}
            color={getStatusColor(item.status)}
          />
        </View>

        {/* COMPACT ROW */}
        <View style={styles.routeRow}>
          <Text style={styles.routeText}>
            {getFirstWord(item.pickup_address)} → {getFirstWord(item.drop_address)}
          </Text>
          <Text style={styles.fareText}>₹{fare}</Text>
        </View>

        {/* EXPANDED DETAILS */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.detailText}>
              <Text style={styles.bold}>Pickup: </Text>
              {item.pickup_address || 'N/A'}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.bold}>Drop: </Text>
              {item.drop_address || 'N/A'}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.bold}>Fare: </Text>₹{fare}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.bold}>Time: </Text>
              {date}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.bold}>Passenger: </Text>
              {item.passenger_name || 'Unknown'}
            </Text>

            <Text style={[styles.detailText, { color: getStatusColor(item.status) }]}>
              <Text style={styles.bold}>Status: </Text>
              {item.status}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={28}
          color={theme.colors.primary}
          style={{ padding: 4 }}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Earnings</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* TOTAL EARNINGS */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Lifetime Earnings</Text>

        <View style={styles.earningRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <Text style={styles.amountValue}>{Number(totalEarnings).toFixed(2)}</Text>
        </View>
      </Card>

      {/* RIDE HISTORY */}
      <Text style={styles.summaryLabel}>          Ride History</Text>
      <Text style={{ height: 10 }} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRide}
          keyExtractor={(item) => `ride-${item.id}`}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },

  title: {
    ...theme.typography.heading2,
    flex: 1,
    textAlign: 'center',
  },

  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },

  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },

  earningRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: theme.spacing.sm,
  },

  rupeeSymbol: {
    fontWeight: 'bold',
    fontSize: 36,
    color: theme.colors.primary,
  },

  amountValue: {
    fontWeight: 'bold',
    fontSize: 36,
    marginLeft: 4,
    color: theme.colors.primary,
  },

  list: {
    paddingHorizontal: theme.spacing.lg,
  },

  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  dateText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },

  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  routeText: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
  },

  fareText: {
    ...theme.typography.heading3,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  expandedContent: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },

  detailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginVertical: 2,
  },

  bold: {
    fontWeight: 'bold',
  },
});
