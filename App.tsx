// ClimaLens — App Entry Point
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';

import { ThemeProvider } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import './src/i18n';
import { useSettingsStore } from './src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { registerForPushNotificationsAsync } from './src/services/NotificationService';
import { supabase } from './src/services/supabaseClient';
import { AdminBotService } from './src/services/AdminBotService';

// Keep the native splash screen visible until we explicitly hide it
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

// Global Error Handler for Telegram Alerts
if (!__DEV__) {
  const defaultErrorHandler = (globalThis as any).ErrorUtils?.getGlobalHandler();
  (globalThis as any).ErrorUtils?.setGlobalHandler((error: any, isFatal: boolean) => {
    // Fire off alert to Telegram asynchronously
    AdminBotService.sendCrashAlert(error.message || String(error), isFatal).catch(() => {});
    
    // Call the original handler
    if (defaultErrorHandler) {
      defaultErrorHandler(error, isFatal);
    }
  });
}

function LanguageSync() {
  const language = useSettingsStore(s => s.language);
  const { i18n } = useTranslation();
  
  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return null;
}

function LocationBackgroundSync() {
  React.useEffect(() => {
    let isFetching = false;

    const syncLocationSilent = async () => {
      if (isFetching || Platform.OS === 'web') return;
      isFetching = true;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geocode && geocode.length > 0) {
            const city = geocode[0].city || geocode[0].region || 'Unknown Location';
            const settings = useSettingsStore.getState();
            if (settings.homeDistrict !== city) {
              settings.setHomeDistrict(city);
              if (settings.pushToken) {
                supabase.from('push_tokens').update({ home_district: city }).eq('token', settings.pushToken).then(undefined, () => {});
              }
            }
          }
        }
      } catch (e) {
        // Silently fail if location fetch fails in background
      } finally {
        isFetching = false;
      }
    };

    // Run once on mount
    syncLocationSilent();

    // Run every time app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncLocationSilent();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

export default function App() {
  React.useEffect(() => {
    async function setupNotifications() {
      const settingsStore = useSettingsStore.getState();
      if (!settingsStore.notificationsEnabled) return;
      
      const token = await registerForPushNotificationsAsync();
      if (token) {
        settingsStore.setPushToken(token);
        // Save the token to Supabase silently
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('push_tokens').upsert({
          token: token,
          user_id: session?.user?.id || null,
          home_district: settingsStore.homeDistrict || 'Colombo',
          updated_at: new Date().toISOString()
        }, { onConflict: 'token' });
      }
    }
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageSync />
          <LocationBackgroundSync />
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
