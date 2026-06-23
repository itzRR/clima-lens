import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string, avatarGradient: number, avatarSeed?: string) => Promise<void>;
}

import { useItineraryStore } from './useItineraryStore';

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  loading: true,
  initialize: async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, loading: false });

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession });
      // When user logs in/out, reload their trips from Supabase
      if (newSession) {
        useItineraryStore.getState().loadAllItineraries();
        useItineraryStore.getState().loadOrCreateItinerary();
      }
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
  updateProfile: async (displayName: string, avatarGradient: number, avatarSeed?: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_gradient: avatarGradient,
        avatar_seed: avatarSeed,
      }
    });
    if (data?.user) {
      // Refresh session to get updated metadata
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });
    }
  },
}));
