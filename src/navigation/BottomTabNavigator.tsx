import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

// Import all screens for the new architecture
import TripPlannerScreen from '../screens/plan/TripPlannerScreen';
import RecommendationsScreen from '../screens/plan/RecommendationsScreen';
import DestinationDetailScreen from '../screens/plan/DestinationDetailScreen';
import TripMapScreen from '../screens/plan/TripMapScreen';
import MyTripScreen from '../screens/plan/MyTripScreen';

import RiskMapScreen from '../screens/risk/RiskMapScreen';
import DistrictDetailScreen from '../screens/risk/DistrictDetailScreen';
import DitwahReplayScreen from '../screens/risk/DitwahReplayScreen';

import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const PlanStack = createNativeStackNavigator();
const RiskStack = createNativeStackNavigator();
const TripStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

// Stack Navigators
function PlanNavigator() {
  return (
    <PlanStack.Navigator screenOptions={{ headerShown: false }}>
      <PlanStack.Screen name="TripPlanner" component={TripPlannerScreen} />
      <PlanStack.Screen name="Recommendations" component={RecommendationsScreen} />
      <PlanStack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
      <PlanStack.Screen name="TripMap" component={TripMapScreen} />
    </PlanStack.Navigator>
  );
}

function RiskNavigator() {
  return (
    <RiskStack.Navigator screenOptions={{ headerShown: false }}>
      <RiskStack.Screen name="RiskMap" component={RiskMapScreen} />
      <RiskStack.Screen name="DistrictDetail" component={DistrictDetailScreen} />
      <RiskStack.Screen name="DitwahReplay" component={DitwahReplayScreen} />
      <RiskStack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
    </RiskStack.Navigator>
  );
}

function TripNavigator() {
  return (
    <TripStack.Navigator screenOptions={{ headerShown: false }}>
      <TripStack.Screen name="MyTrip" component={MyTripScreen} />
      <TripStack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
    </TripStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsScreen" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Plan: { active: 'compass', inactive: 'compass-outline' },
  Risk: { active: 'warning', inactive: 'warning-outline' },
  Trip: { active: 'briefcase', inactive: 'briefcase-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

function TabBarIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const icons = TAB_ICONS[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = focused ? icons.active : icons.inactive;

  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 200 });
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, focused && styles.activeIconBg]}>
      <Ionicons name={iconName} size={22} color={color} />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const tabLabels: Record<string, string> = {
    Plan: 'Plan a Trip',
    Risk: 'Risk Map',
    Trip: 'My Trip',
    Settings: 'Settings',
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(12, 14, 13, 0.85)' : 'rgba(255, 255, 255, 0.85)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tabLabels[route.name]}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              {/* Active glow indicator */}
              {isFocused && <View style={styles.activeGlow} />}
              <TabBarIcon
                name={route.name}
                focused={isFocused}
                color={isFocused ? Colors.tabBarActive : Colors.tabBarInactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? Colors.tabBarActive : Colors.tabBarInactive },
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {tabLabels[route.name]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Plan" component={PlanNavigator} />
      <Tab.Screen name="Risk" component={RiskNavigator} />
      <Tab.Screen name="Trip" component={TripNavigator} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius['3xl'],
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
      } as any,
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 5,
    minHeight: 48,
    borderRadius: BorderRadius.xl,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
  },
  activeGlow: {
    position: 'absolute',
    top: -1,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px rgba(74, 222, 128, 0.6)',
      } as any,
      default: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
    }),
  },
  activeIconBg: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderRadius: BorderRadius.full,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  tabLabel: {
    ...Typography.tab,
    color: Colors.tabBarInactive,
    fontSize: 10,
  },
  tabLabelActive: {
    color: Colors.tabBarActive,
    fontWeight: '700',
  },
});
