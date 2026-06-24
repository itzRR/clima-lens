// ClimaLens — Settings Store (Zustand)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../theme/ThemeContext';

interface SettingsState {
  language: 'en' | 'si' | 'ta';
  theme: ThemeMode;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  isGuest: boolean;
  userName: string;
  userEmail: string;
  isOnboarded: boolean;
  savedDestinations: string[];
  pushToken: string | null;
  homeDistrict: string | null;
  setLanguage: (lang: 'en' | 'si' | 'ta') => void;
  setTheme: (theme: ThemeMode) => void;
  setNotifications: (enabled: boolean) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setGuest: (isGuest: boolean) => void;
  setUser: (name: string, email: string) => void;
  setOnboarded: (onboarded: boolean) => void;
  toggleSaveDestination: (slug: string) => void;
  setPushToken: (token: string | null) => void;
  setHomeDistrict: (district: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      theme: 'dark',
      notificationsEnabled: true,
      locationEnabled: true,
      isGuest: true,
      userName: 'Explorer',
      userEmail: '',
      isOnboarded: false,
      savedDestinations: [],
      pushToken: null,
      homeDistrict: 'Colombo',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
      setLocationEnabled: (locationEnabled) => set({ locationEnabled }),
      setGuest: (isGuest) => set({ isGuest }),
      setUser: (userName, userEmail) => set({ userName, userEmail, isGuest: false }),
      setOnboarded: (isOnboarded) => set({ isOnboarded }),
      toggleSaveDestination: (slug) =>
        set((state) => ({
          savedDestinations: state.savedDestinations.includes(slug)
            ? state.savedDestinations.filter((s) => s !== slug)
            : [...state.savedDestinations, slug],
        })),
      setPushToken: (pushToken) => set({ pushToken }),
      setHomeDistrict: (homeDistrict) => set({ homeDistrict }),
    }),
    {
      name: 'clima-lens-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
