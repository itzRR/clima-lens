import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { BottomTabNavigator } from './BottomTabNavigator';
import { AuthNavigator } from './AuthNavigator';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isOnboarded } = useSettingsStore();
  const { session, loading: authLoading, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!isOnboarded);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Initialize Auth Session
    initialize();

    // Simulate cache hydration delay for splash screen
    const timer = setTimeout(() => setIsReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady || authLoading) {
    return <SplashScreen />;
  }

  const navTheme = {
    dark: isDark,
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.glassBorder,
      notification: colors.danger,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  if (showOnboarding) {
    return (
      <NavigationContainer theme={navTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <OnboardingScreen onComplete={() => {
          useSettingsStore.getState().setOnboarded(true);
          setShowOnboarding(false);
        }} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="AuthStack" component={AuthNavigator} />
        )}
      </Stack.Navigator>
      {session && <OfflineBanner />}
    </NavigationContainer>
  );
}
