import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';
import * as Notifications from 'expo-notifications';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data as User);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signOut = async () => {
    try {
      // Remove expo token from user's profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: null })
          .eq('id', session.user.id);
      }
      
      // Clear notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Sign out
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const checkExistingSession = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_session_time, expo_push_token')
      .eq('id', userId)
      .single();

    if (profile?.expo_push_token) {
      // If there's an existing token and it's been less than 1 minute
      const lastSessionTime = new Date(profile.last_session_time || 0);
      const timeDiff = Date.now() - lastSessionTime.getTime();
      
      if (timeDiff < 60000) { // 1 minute in milliseconds
        await signOut();
        throw new Error('This account is already active on another device');
      }
    }

    // Update last session time
    await supabase
      .from('profiles')
      .update({ last_session_time: new Date().toISOString() })
      .eq('id', userId);
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    checkExistingSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
