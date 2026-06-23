import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Simple polyfill for web offline detection without needing the native NetInfo module
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsConnected(navigator.onLine);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    // For native, we assume connected for this prototype to avoid native module rebuilds
    return () => {};
  }, []);

  if (isConnected) return null;

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(300)}
      style={[
        styles.container, 
        // We add some bottom padding to sit nicely above the BottomTabBar 
        // In a real app we might dynamically measure the tab bar height, but this works universally.
        { bottom: insets.bottom + 65 }
      ]}
    >
      <Text style={styles.text}>📡 Showing cached data — last updated today</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#2B2B2B', // dark grey
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999, // Float above everything
  },
  text: {
    ...Typography.caption,
    color: '#E0E0E0',
    fontWeight: '500',
  },
});
