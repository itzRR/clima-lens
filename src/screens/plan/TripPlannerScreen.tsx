import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { supabase } from '../../services/supabaseClient';
import { useSettingsStore } from '../../store/settingsStore';
import { GlassCard } from '../../components/common/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Location from 'expo-location';

const MONTHS = [
  { id: 1, name: 'Jan', season: 'dry' },
  { id: 2, name: 'Feb', season: 'dry' },
  { id: 3, name: 'Mar', season: 'dry' },
  { id: 4, name: 'Apr', season: 'intermonsoon' },
  { id: 5, name: 'May', season: 'wet' },
  { id: 6, name: 'Jun', season: 'wet' },
  { id: 7, name: 'Jul', season: 'wet' },
  { id: 8, name: 'Aug', season: 'wet' },
  { id: 9, name: 'Sep', season: 'wet' },
  { id: 10, name: 'Oct', season: 'intermonsoon' },
  { id: 11, name: 'Nov', season: 'intermonsoon' },
  { id: 12, name: 'Dec', season: 'dry' },
];

const INTERESTS = [
  { id: 'surfing', name: 'Surfing', icon: 'water-outline' },
  { id: 'wildlife', name: 'Wildlife', icon: 'paw-outline' },
  { id: 'hiking', name: 'Hiking', icon: 'walk-outline' },
  { id: 'culture', name: 'Culture', icon: 'business-outline' },
  { id: 'beaches', name: 'Beaches', icon: 'sunny-outline' },
  { id: 'food', name: 'Food', icon: 'restaurant-outline' },
];

export default function TripPlannerScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { colors, isDark } = useTheme();
  const { locationEnabled } = useSettingsStore();

  // Location & Weather State
  const [locationName, setLocationName] = useState<string | null>(null);
  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Fetch Location & Weather
  const fetchLocationAndWeather = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get city name (Unsupported on Web in SDK 49+)
      if (Platform.OS !== 'web') {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode && geocode.length > 0) {
          const city = geocode[0].city || geocode[0].region || 'Unknown Location';
          setLocationName(city);
          
          // Save to settings and update push token row
          const settings = useSettingsStore.getState();
          settings.setHomeDistrict(city);
          if (settings.pushToken) {
            supabase.from('push_tokens').update({ home_district: city }).eq('token', settings.pushToken).then(undefined, () => {});
          }
        }
      } else {
        setLocationName('Web Browser Location');
      }

      // Mock Weather based on coordinates to show different states
      const randomWeatherSeed = Math.floor(location.coords.latitude + location.coords.longitude) % 3;
      if (randomWeatherSeed === 0) setWeatherCondition('Rain');
      else if (randomWeatherSeed === 1) setWeatherCondition('Cloudy');
      else setWeatherCondition('Clear');

      setTemperature(Math.floor(Math.random() * 10) + 24); // 24-34 degrees

    } catch (error) {
      console.warn("Error fetching location: ", error);
    } finally {
      setLoadingLocation(false);
    }
  };

  React.useEffect(() => {
    if (locationEnabled) {
      fetchLocationAndWeather();
    }
  }, [locationEnabled]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'dry': return 'sunny';
      case 'wet': return 'rainy';
      default: return 'partly-sunny';
    }
  };

  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'dry': return '#F59E0B';
      case 'wet': return '#3B82F6';
      default: return '#A855F7';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Weather Gradient Background */}
      <LinearGradient
        colors={
          weatherCondition === 'Rain'
            ? (isDark ? ['#0B1A2E', '#091520', colors.background] : ['#B3D9FF', '#E0EFFF', colors.background])
            : weatherCondition === 'Clear'
            ? (isDark ? ['#1A1500', '#0F0D00', colors.background] : ['#FFF3D4', '#FFFBE6', colors.background])
            : weatherCondition === 'Cloudy'
            ? (isDark ? ['#1A1D20', '#111314', colors.background] : ['#E0E4E8', '#F0F2F4', colors.background])
            : [colors.background, colors.background, colors.background]
        }
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('explore.title', 'Plan a Trip')}</Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>{t('common.appName', 'ClimaLens')}</Text>
        </Animated.View>

        {/* Live Location Weather Card — only show when loading or location is found */}
        {locationEnabled && (loadingLocation || locationName) && (
        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={[styles.locationCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.glassBorder }]}>
          <View style={styles.locationHeader}>
            <View style={styles.locationTitleRow}>
              <Ionicons name="navigate-circle" size={24} color={colors.accent} />
              <Text style={[styles.locationTitle, { color: colors.accent }]}>Your Current Location</Text>
            </View>
            <TouchableOpacity onPress={fetchLocationAndWeather}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {loadingLocation ? (
            <Text style={[styles.locationSubText, { color: colors.textSecondary }]}>Locating you...</Text>
          ) : locationName ? (
            <View style={styles.weatherInfo}>
              <View>
                <Text style={[styles.cityName, { color: colors.textPrimary }]}>{locationName}</Text>
                <Text style={[styles.weatherCondition, { color: colors.textSecondary }]}>{weatherCondition} • {temperature}°C</Text>
              </View>
              <View style={[styles.weatherIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Ionicons 
                  name={weatherCondition === 'Rain' ? 'rainy' : weatherCondition === 'Clear' ? 'sunny' : 'partly-sunny'} 
                  size={36} 
                  color={weatherCondition === 'Clear' ? '#F59E0B' : weatherCondition === 'Rain' ? '#3B82F6' : colors.textSecondary} 
                />
              </View>
            </View>
          ) : null}
        </Animated.View>
        )}

        {/* Section 01: When */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionNumber, { color: colors.accent + '30' }]}>01</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('explore.pickMonth', 'When are you traveling?')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
            {MONTHS.map((month) => {
              const isSelected = selectedMonth === month.id;
              const seasonColor = getSeasonColor(month.season);
              return (
                <TouchableOpacity
                  key={month.id}
                  style={[
                    styles.monthCard,
                    { backgroundColor: colors.surface, borderColor: colors.glassBorder },
                    isSelected && [styles.monthCardActive, { borderColor: colors.accent }]
                  ]}
                  onPress={() => setSelectedMonth(month.id)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={[colors.accent, '#22C55E']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <View style={[styles.seasonDot, { backgroundColor: isSelected ? 'rgba(0,0,0,0.3)' : seasonColor + '40' }]}>
                    <Ionicons 
                      name={getSeasonIcon(month.season)} 
                      size={18} 
                      color={isSelected ? '#fff' : seasonColor} 
                    />
                  </View>
                  <Text style={[styles.monthName, { color: colors.textSecondary }, isSelected && styles.monthNameActive]}>
                    {t(`months.${month.name.toLowerCase()}`, month.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Section 02: Interests */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionNumber, { color: colors.accent + '30' }]}>02</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('explore.interests', 'What are your interests?')}</Text>
          </View>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    { backgroundColor: colors.surface, borderColor: colors.glassBorder },
                    isSelected && [styles.interestChipActive, { borderColor: colors.accent }]
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={[colors.accent, '#22C55E']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
                    />
                  )}
                  <View style={[styles.interestIcon, { backgroundColor: isSelected ? 'rgba(0,0,0,0.15)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }]}>
                    <Ionicons 
                      name={interest.icon as any} 
                      size={18} 
                      color={isSelected ? '#fff' : colors.textSecondary} 
                    />
                  </View>
                  <Text style={[styles.interestText, { color: colors.textSecondary }, isSelected && styles.interestTextActive]}>
                    {t(`interests.${interest.id}`, interest.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, selectedInterests.length === 0 && styles.ctaButtonDisabled]}
            disabled={selectedInterests.length === 0}
            onPress={() => navigation.navigate('Recommendations', { month: selectedMonth, interests: selectedInterests })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedInterests.length > 0 ? [colors.accent, '#22C55E'] : [colors.surface, colors.surface]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full, opacity: selectedInterests.length === 0 ? 0.3 : 1 }]}
            />
            <Ionicons name="compass-outline" size={22} color={selectedInterests.length > 0 ? colors.background : colors.textTertiary} />
            <Text style={[styles.ctaText, selectedInterests.length === 0 && { color: colors.textTertiary }]}>
              {t('explore.findDestinations', 'Find Destinations')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={selectedInterests.length > 0 ? colors.background : colors.textTertiary} />
          </TouchableOpacity>
          {selectedInterests.length === 0 && (
            <Text style={[styles.ctaHint, { color: colors.textTertiary }]}>Select at least one interest to continue</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 160,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  locationCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationTitle: {
    ...Typography.caption,
    color: Colors.accent,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  locationSubText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  weatherInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  cityName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  weatherCondition: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  weatherIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.accent + '30',
    letterSpacing: -1,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  monthScroll: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  monthCard: {
    width: 72,
    height: 100,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    gap: 6,
  },
  monthCardActive: {
    borderColor: Colors.accent,
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
      } as any,
      default: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  seasonDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  monthNameActive: {
    color: Colors.background,
  },
  seasonLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  interestChipActive: {
    borderColor: Colors.accent,
  },
  interestIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  interestTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  ctaContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    width: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    ...Typography.button,
    color: Colors.background,
    fontSize: 17,
  },
  ctaHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
