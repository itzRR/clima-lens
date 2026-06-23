// ClimaLens — Home Screen (Awwwards Edition)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Dimensions, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeInRight, SlideInRight,
  useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing,
  withSequence, withDelay, interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '../../components/common/GlassCard';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { fetchCurrentWeather, fetchForecast, calculateComfortScore, getWeatherDescription } from '../../services/weatherService';
import { calculateRiskScore, calculateTravelScore } from '../../services/riskEngine';
import { WeatherData, ForecastDay, RiskScore } from '../../types';
import { SRI_LANKA_CENTER, getRiskLevel } from '../../data/constants';
import { destinations } from '../../data/destinations';
import { useDestinationsStore } from '../../store/useDestinationsStore';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// --- Premium Gradient Orb ---
function GradientOrb() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false
    );
    scale.value = withRepeat(
      withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.orbContainer, animStyle]}>
      <LinearGradient
        colors={['#4ADE80', '#22C55E', '#0F3D2E', '#4ADE8040']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.orb}
      />
    </Animated.View>
  );
}

// --- Sub-components ---

function HeroHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  
  const displayName = session?.user?.user_metadata?.display_name || '';
  const avatarGradient = session?.user?.user_metadata?.avatar_gradient || 0;
  
  const GRADIENTS: [string, string][] = [
    ['#4ADE80', '#22C55E'],
    ['#00D4FF', '#0066FF'],
    ['#FF6B6B', '#FFE66D'],
    ['#A855F7', '#EC4899'],
    ['#22C55E', '#16A34A'],
    ['#F97316', '#EF4444'],
    ['#6366F1', '#8B5CF6'],
    ['#1E3A5F', '#4A90D9'],
  ];
  
  const getInitials = () => {
    if (!displayName) return session?.user?.email?.charAt(0)?.toUpperCase() || 'U';
    return displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const gradient = GRADIENTS[avatarGradient % GRADIENTS.length];

  return (
    <LinearGradient
      colors={['#0F3D2E', '#0A2A1F', '#090B0A']}
      style={[styles.hero, { paddingTop: insets.top + 16 }]}
    >
      {/* Ambient glow */}
      <View style={styles.ambientGlow} />
      
      <View style={styles.heroTop}>
        <View style={styles.heroTopLeft}>
          {/* Avatar */}
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.greeting}>
              {t('home.greeting', { timeOfDay: t(`home.${getTimeOfDay()}`) })}
              {displayName ? `, ${displayName.split(' ')[0]}` : ''}
            </Text>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>Colombo, Sri Lanka</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={20} color={Colors.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.heroTitle}>
        <GradientOrb />
        <Text style={styles.heroText}>{t('common.tagline')}</Text>
        <Text style={styles.heroSub}>{t('auth.welcomeSub')}</Text>
      </Animated.View>
    </LinearGradient>
  );
}

function WeatherCard({ weather, forecast }: { weather: WeatherData | null; forecast: ForecastDay[] }) {
  const { t } = useTranslation();
  if (!weather) return null;
  const desc = getWeatherDescription(weather.weatherCode);

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(600)}>
      <GlassCard variant="elevated" style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <View style={styles.weatherLabelRow}>
            <View style={styles.accentDot} />
            <Text style={styles.sectionOverline}>{t('home.weatherSummary')}</Text>
          </View>
          <Text style={styles.weatherIcon}>{desc.icon}</Text>
        </View>
        <View style={styles.weatherMain}>
          <Text style={styles.tempLarge}>{Math.round(weather.temperature)}°</Text>
          <View style={styles.weatherDetails}>
            <Text style={styles.weatherDesc}>{desc.description}</Text>
            <View style={styles.weatherMetaRow}>
              <View style={styles.weatherMeta}>
                <Ionicons name="water-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.weatherDetail}>{weather.humidity}%</Text>
              </View>
              <View style={styles.weatherMeta}>
                <Ionicons name="speedometer-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.weatherDetail}>{Math.round(weather.windSpeed)} km/h</Text>
              </View>
              <View style={styles.weatherMeta}>
                <Ionicons name="rainy-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.weatherDetail}>{weather.precipitation}mm</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Mini forecast */}
        <View style={styles.forecastRow}>
          {forecast.slice(0, 5).map((day, i) => {
            const d = new Date(day.date);
            const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' });
            const icon = getWeatherDescription(day.weatherCode).icon;
            return (
              <View key={day.date} style={[styles.forecastDay, i === 0 && styles.forecastDayActive]}>
                <Text style={[styles.forecastDayName, i === 0 && { color: Colors.accent }]}>{dayName}</Text>
                <Text style={styles.forecastIconText}>{icon}</Text>
                <Text style={styles.forecastTemp}>{Math.round(day.temperatureMax)}°</Text>
                <Text style={styles.forecastTempMin}>{Math.round(day.temperatureMin)}°</Text>
              </View>
            );
          })}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function ScoreCards({ riskScore, travelScore, comfortScore }: {
  riskScore: RiskScore; travelScore: number; comfortScore: number;
}) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.scoresRow}>
      <GlassCard variant="glow" glowColor={riskScore.color} style={styles.scoreCard}>
        <ScoreGauge
          score={100 - riskScore.score}
          size={90}
          strokeWidth={7}
          color={riskScore.color}
          label={t('home.safetyRating')}
          sublabel={riskScore.label}
          delay={600}
        />
      </GlassCard>
      <GlassCard variant="glow" glowColor={Colors.accent} style={styles.scoreCard}>
        <ScoreGauge
          score={travelScore}
          size={90}
          strokeWidth={7}
          color={Colors.accent}
          label={t('home.travelScore')}
          sublabel={travelScore >= 70 ? 'Excellent' : travelScore >= 50 ? 'Good' : 'Fair'}
          delay={800}
        />
      </GlassCard>
      <GlassCard variant="glow" glowColor={comfortScore >= 70 ? '#22C55E' : comfortScore >= 40 ? '#F59E0B' : '#EF4444'} style={styles.scoreCard}>
        <ScoreGauge
          score={comfortScore}
          size={90}
          strokeWidth={7}
          color={comfortScore >= 70 ? '#22C55E' : comfortScore >= 40 ? '#F59E0B' : '#EF4444'}
          label={t('home.comfortIndex')}
          sublabel={comfortScore >= 70 ? 'Pleasant' : comfortScore >= 40 ? 'Warm' : 'Hot'}
          delay={1000}
        />
      </GlassCard>
    </Animated.View>
  );
}

function RecommendedCard() {
  const { t } = useTranslation();
  const { destinations } = useDestinationsStore();
  
  const dest = destinations.length > 0 ? destinations[0] : null;
  if (!dest) return null;

  return (
    <Animated.View entering={FadeInDown.delay(700).duration(600)}>
      <View style={styles.sectionHeader}>
        <View style={styles.accentDot} />
        <Text style={styles.sectionTitle}>{t('home.recommended')}</Text>
      </View>
      <GlassCard noPadding variant="accent" style={styles.recCard}>
        <LinearGradient
          colors={['#1B5E20', '#0F3D2E', '#0A2A1F']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.recGradient}
        >
          {/* Shimmer overlay */}
          <View style={styles.shimmerOverlay} />
          <View style={styles.recContent}>
            <View style={styles.recBadge}>
              <Text style={styles.recBadgeText}>🏔️ AI RECOMMENDED</Text>
            </View>
            <Text style={styles.recName}>{dest.name}</Text>
            <Text style={styles.recDesc} numberOfLines={2}>{dest.district} District</Text>
            <View style={styles.recMeta}>
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaLabel}>Travel Score</Text>
                <Text style={styles.recMetaValue}>{dest.suitability_score}</Text>
              </View>
              <View style={styles.recDivider} />
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaLabel}>Risk</Text>
                <Text style={[styles.recMetaValue, { color: dest.risk_color }]}>{t(dest.risk_tier, 'Risk')}</Text>
              </View>
              <View style={styles.recDivider} />
              <View style={styles.recMetaItem}>
                <Text style={styles.recMetaLabel}>Weather</Text>
                <Text style={styles.recMetaValue}>{dest.temp}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </GlassCard>
    </Animated.View>
  );
}

function InsightsSection() {
  const { t } = useTranslation();
  const insights = [
    { icon: 'rainy-outline', title: t('home.rainfallForecast'), value: '12mm', sub: 'Expected today', color: '#6366F1' },
    { icon: 'sunny-outline', title: t('home.bestTime'), value: 'Jan-Mar', sub: 'Dry season peak', color: '#F59E0B' },
    { icon: 'people-outline', title: 'Community Activity', value: '24', sub: 'Reports this week', color: '#22C55E' },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(900).duration(600)}>
      <View style={styles.sectionHeader}>
        <View style={styles.accentDot} />
        <Text style={styles.sectionTitle}>{t('home.travelInsights')}</Text>
      </View>
      <View style={styles.insightsGrid}>
        {insights.map((item, i) => (
          <Animated.View key={i} entering={FadeInRight.delay(1000 + i * 100).duration(500)}>
            <GlassCard style={styles.insightCard}>
              <View style={[styles.insightIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightSub}>{item.sub}</Text>
              </View>
              <Text style={[styles.insightValue, { color: item.color }]}>{item.value}</Text>
            </GlassCard>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// --- Main Screen ---

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [comfortScore, setComfortScore] = useState(0);
  const [travelScore, setTravelScore] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { destinations, subscribeToDestinations, unsubscribeFromDestinations } = useDestinationsStore();

  useEffect(() => {
    subscribeToDestinations();
    return () => unsubscribeFromDestinations();
  }, []);

  const loadData = async () => {
    try {
      useDestinationsStore.getState().fetchDestinations();
      
      const [w, f] = await Promise.all([
        fetchCurrentWeather(SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng),
        fetchForecast(SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng),
      ]);
      setWeather(w);
      setForecast(f);

      const risk = calculateRiskScore(w, 'Colombo');
      setRiskScore(risk);

      const comfort = calculateComfortScore(w);
      setComfortScore(comfort);
      setTravelScore(calculateTravelScore(risk.score, comfort));
    } catch (e) {
      console.error('Failed to load data:', e);
      // Set fallback data
      const fallbackRisk = calculateRiskScore(null, 'Colombo');
      setRiskScore(fallbackRisk);
      setComfortScore(65);
      setTravelScore(72);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.accent} colors={[Colors.accent]} />
        }
      >
        <HeroHeader />

        <View style={styles.content}>
          <WeatherCard weather={weather} forecast={forecast} />

          {riskScore && (
            <ScoreCards
              riskScore={riskScore}
              travelScore={travelScore}
              comfortScore={comfortScore}
            />
          )}

          <RecommendedCard />
          <InsightsSection />

          {/* Bottom spacing for tab bar */}
          <View style={{ height: insets.bottom + 140 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  // --- Hero ---
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    ...(Platform.OS === 'web' ? { filter: 'blur(60px)' } : {}) as any,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  heroTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  greeting: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  locationText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: '#0A2A1F',
  },
  heroTitle: {
    alignItems: 'center',
    gap: 12,
  },
  orbContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.9,
  },
  heroText: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  // --- Content ---
  content: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.lg,
    marginTop: -Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  accentDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  sectionOverline: {
    ...Typography.overline,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  // --- Weather ---
  weatherCard: {
    gap: Spacing.base,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherIcon: {
    fontSize: 32,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tempLarge: {
    fontSize: 72,
    fontWeight: '100',
    color: Colors.textPrimary,
    letterSpacing: -4,
    lineHeight: 76,
  },
  weatherDetails: {
    flex: 1,
    gap: 6,
  },
  weatherDesc: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  weatherMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  weatherMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherDetail: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: Spacing.md,
    gap: 4,
  },
  forecastDay: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  forecastDayActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  forecastDayName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  forecastIconText: {
    fontSize: 20,
  },
  forecastTemp: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  forecastTempMin: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  // --- Scores ---
  scoresRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  // --- Recommended ---
  recCard: {
    overflow: 'hidden',
  },
  recGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    right: -100,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ skewX: '-15deg' }],
  },
  recContent: {
    gap: Spacing.md,
  },
  recBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  recBadgeText: {
    ...Typography.overline,
    color: Colors.accent,
    fontSize: 10,
  },
  recName: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  recDesc: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.6)',
  },
  recMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  recMetaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  recMetaLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  recMetaValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  recDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // --- Insights ---
  insightsGrid: {
    gap: Spacing.sm,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  insightIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  insightSub: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  insightValue: {
    ...Typography.h3,
    fontWeight: '800',
  },
});
