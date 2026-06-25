import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn, interpolate, useAnimatedStyle, useAnimatedScrollHandler, useSharedValue, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useDestinationsStore } from '../../store/useDestinationsStore';
import { supabase } from '../../services/supabaseClient';
import { matchDisastersToLocation } from '../../utils/disasterMatcher';
import { getTripWeatherForecast, DailyWeather } from '../../services/weatherApi';
import { predictDisasterRisk } from '../../utils/EdgeInference';
import { useItineraryStore } from '../../store/useItineraryStore';

const { width } = Dimensions.get('window');

// Real per-location climate baselines for computing monthly suitability
const historicalBaselines = require('../../utils/historical_baselines.json');

/**
 * Compute monthly suitability scores for a destination using real historical climate data.
 * Score = 100 - (precipitation penalty) - (temperature deviation penalty), clamped to [5, 98].
 * This ensures every destination gets a unique, realistic "Best Time to Visit" chart.
 */
function computeMonthlyScores(locationName?: string, districtName?: string): number[] {
  // Try to find baselines for this specific location or district
  let baseline = historicalBaselines[locationName || ''] 
    || historicalBaselines[districtName || '']
    || null;

  // If exact match not found, try partial match
  if (!baseline) {
    const searchName = (locationName || '').toLowerCase();
    const searchDistrict = (districtName || '').toLowerCase();
    for (const key of Object.keys(historicalBaselines)) {
      const k = key.toLowerCase();
      if (k !== '_fallback_' && (k.includes(searchName) || searchName.includes(k) || k.includes(searchDistrict))) {
        baseline = historicalBaselines[key];
        break;
      }
    }
  }

  // If still not found, use the fallback
  if (!baseline) {
    baseline = historicalBaselines['_FALLBACK_'];
  }

  if (!baseline) {
    // Ultimate fallback: generic Sri Lanka dry/wet season pattern
    return [78, 82, 80, 60, 35, 25, 30, 40, 45, 55, 70, 75];
  }

  const scores: number[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthData = baseline[month.toString()];
    if (!monthData) {
      scores.push(50);
      continue;
    }
    const precip = monthData.avg_precip || 0;
    const temp = monthData.avg_temp || 27;

    // Suitability: penalize heavy rain (biggest factor) and extreme temperatures
    const precipPenalty = Math.min(precip * 6, 70);  // Heavy rain months get penalized hard
    const tempPenalty = Math.abs(temp - 26) * 2.5;    // Ideal temp is ~26°C
    const raw = 100 - precipPenalty - tempPenalty;
    scores.push(Math.max(5, Math.min(98, Math.round(raw))));
  }

  return scores;
}

export default function DestinationDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const { id, name = 'Mirissa', isOnlineSearch } = route.params || {};
  const destination = useDestinationsStore(state => state.destinations.find(d => d.id === id || d.name === name));
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loadingDisasters, setLoadingDisasters] = useState(true);
  
  // Trip Date Forecaster State
  const [tripDateLabel, setTripDateLabel] = useState<string | null>(null);
  const [tripForecast, setTripForecast] = useState<DailyWeather | null>(null);
  const [tripRisk, setTripRisk] = useState<string | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const scrollY = useSharedValue(0);

  // Itinerary
  const { addStop, isInItinerary, loadOrCreateItinerary } = useItineraryStore();
  const [addedToTrip, setAddedToTrip] = useState(false);

  // Toast State
  const [toastConfig, setToastConfig] = useState<{visible: boolean, message: string, type: 'success' | 'info'}>({visible: false, message: '', type: 'success'});

  useEffect(() => {
    loadOrCreateItinerary();
  }, []);

  useEffect(() => {
    if (destination?.id) {
      setAddedToTrip(isInItinerary(destination.id));
    }
  }, [destination?.id, isInItinerary]);

  const showToast = (message: string, type: 'success' | 'info') => {
    setToastConfig({ visible: true, message, type });
    setTimeout(() => setToastConfig(prev => ({...prev, visible: false})), 3000);
  };

  const handleAddToItinerary = async () => {
    if (!destination) return;
    const success = await addStop(destination);
    if (success) {
      setAddedToTrip(true);
      showToast(`${name} added to your route!`, 'success');
    } else {
      showToast(`${name} is already in your trip.`, 'info');
    }
  };

  const monthlyScores = computeMonthlyScores(destination?.name || name, destination?.district);

  const chartData = {
    labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
    datasets: [
      {
        data: monthlyScores,
      },
    ],
  };

  useEffect(() => {
    // 1. Fetch Historical Disasters from Supabase
    const fetchDisasters = async () => {
      setLoadingDisasters(true);
      try {
        if (destination?.id && !destination.id.startsWith('temp_')) {
          const { data, error } = await supabase
            .from('historical_disasters')
            .select('*')
            .eq('destination_id', destination.id)
            .order('year', { ascending: false });

          if (error) throw error;
          
          if (data && data.length > 0) {
            setDisasters(data);
          } else {
            // FALLBACK: Use the live geographic rule engine for dynamically searched places!
            const matchedDisasters = matchDisastersToLocation(destination.district || '', destination.name);
            setDisasters(matchedDisasters);
          }
        } else {
          // If the location hasn't been saved to Supabase yet (Google Places API search)
          const matchedDisasters = matchDisastersToLocation(destination?.district || '', name);
          setDisasters(matchedDisasters);
        }
      } catch (err) {
        console.error("Error fetching historical disasters:", err);
        // Fallback on error
        setDisasters(matchDisastersToLocation(destination?.district || '', name));
      } finally {
        setLoadingDisasters(false);
      }
    };

    fetchDisasters();
  }, [id, name, destination?.id]);

  const getActivityIcon = (activityName: string) => {
    const lower = activityName.toLowerCase();
    if (lower.includes('surf') || lower.includes('beach') || lower.includes('scuba') || lower.includes('whale')) return 'water';
    if (lower.includes('safari') || lower.includes('wildlife') || lower.includes('elephant')) return 'paw';
    if (lower.includes('hike') || lower.includes('trek') || lower.includes('mountain')) return 'walk';
    if (lower.includes('culture') || lower.includes('heritage') || lower.includes('temple')) return 'business';
    if (lower.includes('food') || lower.includes('cuisine')) return 'restaurant';
    if (lower.includes('train')) return 'train';
    return 'star';
  };

  const activitiesList = destination?.activities || ["Sightseeing", "Photography", "Local Cuisine"];

  const handlePredictTrip = async (daysAhead: number, label: string) => {
    setLoadingForecast(true);
    setTripDateLabel(label);
    try {
      const lat = destination?.latitude || 6.9271;
      const lon = destination?.longitude || 79.8612;
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // 1. Live Weather or 5-Year Historical Average
      const forecast = await getTripWeatherForecast(lat, lon, dateStr);
      setTripForecast(forecast);
      
      // Calculate Anomaly
      const baselines = require('../../utils/historical_baselines.json');
      const month = targetDate.getMonth() + 1;
      let avgPrecip = 0;
      // Use fallback for now, ideally match district specifically
      if (baselines['_FALLBACK_'] && baselines['_FALLBACK_'][month.toString()]) {
        avgPrecip = baselines['_FALLBACK_'][month.toString()].avg_precip;
      }
      const precip_anomaly = forecast.precip - (avgPrecip / 30);
      
      // 2. Edge AI Risk Inference (Offline ML)
      const elev = destination?.suitability_score || 50; // Mock elevation based on score for demo
      const risk = predictDisasterRisk(forecast.temp, forecast.precip, forecast.wind, elev, precip_anomaly);
      setTripRisk(risk);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingForecast(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={[colors.primary, colors.background]}
          style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: (destination?.risk_color || colors.success) + '20', borderColor: destination?.risk_color || colors.success }]}>
                <Text style={[styles.badgeText, { color: destination?.risk_color || colors.success }]}>
                  {destination ? t(destination.risk_tier, destination.risk_tier.split('.')[1].toUpperCase()) : 'LOW RISK'}
                </Text>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>{destination?.suitability_score ?? 'N/A'}{destination?.suitability_score != null ? '/100' : ''}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Add to Itinerary Button */}
        <TouchableOpacity
          style={[styles.addToTripBtn, addedToTrip && styles.addToTripBtnAdded]}
          onPress={handleAddToItinerary}
          disabled={addedToTrip}
          activeOpacity={0.8}
        >
          <Ionicons
            name={addedToTrip ? 'checkmark-circle' : 'add-circle'}
            size={22}
            color={addedToTrip ? colors.accent : colors.background}
          />
          <Text style={[styles.addToTripText, addedToTrip && styles.addToTripTextAdded]}>
            {addedToTrip ? 'In Your Itinerary' : 'Add to Itinerary'}
          </Text>
        </TouchableOpacity>

        {/* Global Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={styles.disclaimerText}>
            {t('risk.prototype', 'Prototype: Risk levels are based on historical aggregates and AI predictions. Not for emergency use.')}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Risk Breakdown */}
          <Text style={styles.sectionTitle}>{t('risk.title', 'Risk Breakdown')}</Text>
          <View style={styles.cardsGrid}>
            <View style={styles.scoreCard}>
              <Ionicons name="water-outline" size={24} color={colors.accent} />
              <Text style={styles.cardTitle}>{t('risk.floodRisk', 'Flood Risk')}</Text>
              <Text style={[styles.cardValue, { color: colors.success }]}>{t('risk.low', 'Low')}</Text>
            </View>
            <View style={styles.scoreCard}>
              <Ionicons name="analytics-outline" size={24} color={colors.accent} />
              <Text style={styles.cardTitle}>{t('risk.landslideRisk', 'Landslide')}</Text>
              <Text style={[styles.cardValue, { color: colors.success }]}>{t('risk.safe', 'None')}</Text>
            </View>
            <View style={styles.scoreCard}>
              <Ionicons name="thermometer-outline" size={24} color={colors.accent} />
              <Text style={styles.cardTitle}>{t('risk.heatRisk', 'Heat/Humidity')}</Text>
              <Text style={[styles.cardValue, { color: colors.warning }]}>{t('risk.high', 'High')}</Text>
            </View>
          </View>

          {/* Best Months Chart */}
          <Text style={styles.sectionTitle}>{t('explore.bestTime', 'Suitability by Month')}</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={width - Spacing.lg * 2 - Spacing.md * 2} // container width
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`, // colors.accent
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                barPercentage: 0.5,
                propsForLabels: {
                  fontSize: 10,
                }
              }}
              style={styles.chart}
              withInnerLines={false}
              showValuesOnTopOfBars
            />
          </View>

          {/* Historical Disasters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('plan.historical_risk', 'Past Disaster History')}</Text>
            {loadingDisasters ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: Spacing.sm }} />
            ) : disasters.length > 0 ? (
              <View style={styles.disasterList}>
                {disasters.map((disaster, index) => (
                  <View key={index} style={styles.disasterItem}>
                    <View style={styles.disasterHeader}>
                      <View style={styles.disasterTypeContainer}>
                        <Ionicons 
                          name={disaster.type === 'tsunami' ? 'water' : disaster.type === 'flood' ? 'rainy' : disaster.type === 'cyclone' ? 'thunderstorm' : 'warning'} 
                          size={16} 
                          color={disaster.severity === 'critical' ? colors.danger : colors.warning} 
                        />
                        <Text style={[styles.disasterType, { color: disaster.severity === 'critical' ? colors.danger : colors.warning }]}>
                          {disaster.year} • {disaster.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.disasterDescription}>{disaster.description}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDisasterContainer}>
                <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
                <Text style={styles.noDisasterText}>No major historical disasters recorded in our database for this region.</Text>
              </View>
            )}
          </View>

          {/* Activity Match */}
          <Text style={styles.sectionTitle}>{t('explore.interests', 'Top Activities & Attractions')}</Text>
          <View style={styles.activitiesContainer}>
            {activitiesList.map((act, i) => (
              <View key={i} style={styles.activityRow}>
                <Text style={styles.activityName}>{act}</Text>
                <View style={[styles.activityStatus, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.activityStatusText, { color: colors.success }]}>
                    RECOMMENDED
                  </Text>
                  <Ionicons name={getActivityIcon(act) as any} size={14} color={colors.success} />
                </View>
              </View>
            ))}
          </View>

          {/* AI Trip Date Forecaster */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>AI Trip Date Forecaster</Text>
          <Text style={styles.forecasterDesc}>
            Pick a date to predict exact weather and disaster probability. <Text style={{fontWeight: 'bold', color: colors.warning}}>Risk levels change by season</Text> — a location safe in June may be risky in November!
          </Text>
          
          <View style={styles.forecasterButtons}>
            <TouchableOpacity style={styles.forecastBtn} onPress={() => handlePredictTrip(7, 'Next Week')}>
              <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.forecastBtnText}>Next Week</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forecastBtn} onPress={() => handlePredictTrip(30, 'Next Month')}>
              <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.forecastBtnText}>Next Month</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forecastBtn} onPress={() => handlePredictTrip(180, 'In 6 Months')}>
              <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.forecastBtnText}>In 6 Months</Text>
            </TouchableOpacity>
          </View>

          {loadingForecast ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: Spacing.xl, marginBottom: Spacing.xl }} />
          ) : tripForecast && (
            <Animated.View entering={FadeInDown} style={styles.forecastResultCard}>
              <View style={styles.forecastResultHeader}>
                <Text style={styles.forecastResultTitle}>{tripDateLabel}</Text>
                <Text style={styles.forecastResultDate}>{tripForecast.date}</Text>
              </View>
              
              <View style={styles.forecastMetrics}>
                <View style={styles.forecastMetric}>
                  <Ionicons name="thermometer-outline" size={24} color={colors.accent} />
                  <Text style={styles.forecastMetricValue}>{tripForecast.temp}°C</Text>
                  <Text style={styles.forecastMetricLabel}>Temp</Text>
                </View>
                <View style={styles.forecastMetric}>
                  <Ionicons name="rainy-outline" size={24} color={colors.info} />
                  <Text style={styles.forecastMetricValue}>{tripForecast.precip}mm</Text>
                  <Text style={styles.forecastMetricLabel}>Rain</Text>
                </View>
                <View style={styles.forecastMetric}>
                  <Ionicons name="cloud-outline" size={24} color={colors.textSecondary} />
                  <Text style={styles.forecastMetricValue}>{tripForecast.wind}</Text>
                  <Text style={styles.forecastMetricLabel}>Wind km/h</Text>
                </View>
              </View>

              <View style={[styles.forecastRiskContainer, { backgroundColor: tripRisk === 'High' ? colors.danger + '20' : tripRisk === 'Moderate' ? colors.warning + '20' : colors.success + '20' }]}>
                <Ionicons name="warning-outline" size={24} color={tripRisk === 'High' ? colors.danger : tripRisk === 'Moderate' ? colors.warning : colors.success} />
                <View style={styles.forecastRiskTextContainer}>
                  <Text style={[styles.forecastRiskTitle, { color: tripRisk === 'High' ? colors.danger : tripRisk === 'Moderate' ? colors.warning : colors.success }]}>
                    {tripRisk} Disaster Risk
                  </Text>
                  <Text style={[styles.forecastRiskDesc, { color: tripRisk === 'High' ? colors.danger : tripRisk === 'Moderate' ? colors.warning : colors.success }]}>
                    Predicted by ClimaLens Edge AI
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

        </View>
      </ScrollView>

      {/* Beautiful Toast Popup */}
      {toastConfig.visible && (
        <Animated.View 
          entering={SlideInDown.springify().damping(15)} 
          exiting={Platform.OS === 'web' ? undefined : SlideOutDown.springify().damping(15)}
          style={[styles.toastContainer, { bottom: insets.bottom + 120 }]}
        >
          <LinearGradient
            colors={toastConfig.type === 'success' ? ['#052e16', '#064e3b'] : ['#1e1b4b', '#312e81']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={toastConfig.type === 'success' ? "checkmark-circle" : "information-circle"} size={22} color={toastConfig.type === 'success' ? "#4ade80" : "#818cf8"} />
          <Text style={styles.toastText}>{toastConfig.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface + '80',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroContent: {
    gap: Spacing.sm,
  },
  heroTitle: {
    ...Typography.h1,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  scorePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  scorePillText: {
    ...Typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addToTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(74, 222, 128, 0.3)',
      } as any,
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  addToTripBtnAdded: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  addToTripText: {
    color: colors.background,
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  addToTripTextAdded: {
    color: colors.accent,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '50',
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  disclaimerText: {
    ...Typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 6, // Increased to clear tab bar fully
  },
  sectionTitle: {
    ...Typography.h3,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardValue: {
    ...Typography.body,
    fontWeight: '700',
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    borderRadius: BorderRadius.xl,
    paddingRight: 0,
  },
  activitiesContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  activityName: {
    ...Typography.body,
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  activityStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    marginRight: 4,
    letterSpacing: 0.5,
  },
  disasterList: {
    gap: Spacing.md,
  },
  disasterItem: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  disasterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  disasterTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disasterType: {
    fontWeight: '600',
    fontSize: 14,
  },
  disasterDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  noDisasterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  noDisasterText: {
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  forecasterDesc: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  forecasterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forecastBtn: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flex: 1,
    justifyContent: 'center',
  },
  forecastBtnText: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  forecastResultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: Spacing.xl,
  },
  forecastResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    paddingBottom: Spacing.sm,
  },
  forecastResultTitle: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  forecastResultDate: {
    color: colors.primary,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  forecastMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  forecastMetric: {
    alignItems: 'center',
  },
  forecastMetricValue: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginTop: 4,
  },
  forecastMetricLabel: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  forecastRiskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
  },
  forecastRiskTextContainer: {
    marginLeft: Spacing.md,
  },
  forecastRiskTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  forecastRiskDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 2,
  },
  toastContainer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(0,0,0,0.4)'
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
      }
    })
  },
  toastText: {
    ...Typography.bodyMedium,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  }
});
