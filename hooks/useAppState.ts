import { useState, useEffect } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import * as Application from 'expo-application';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';

export const useAppState = () => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [isConnected, setIsConnected] = useState(true);
  const appVersion = Application.nativeApplicationVersion;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    checkNetwork();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      await checkNetwork();
      await checkActiveRide();
    }
    setAppState(nextAppState);
  };

  const checkNetwork = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(!!state.isConnected);
    
    if (!state.isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.'
      );
    }
    return state.isConnected;
  };

  const checkActiveRide = async () => {
    try {
      // Check for active ride when app comes to foreground
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: activeRide } = await supabase
          .from('rides')
          .select('*')
          .eq('passenger_id', session.user.id)
          .eq('status', 'active')
          .single();

        if (activeRide) {
          // Navigate to ride tracking if there's an active ride
          // You'll need to implement the actual navigation logic
        }
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  };

  return {
    appState,
    isConnected,
    appVersion,
    checkNetwork
  };
};