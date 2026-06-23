// ClimaLens — My Trip Screen (Multi-Destination Itinerary)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn, SlideInRight, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { useItineraryStore, estimateTravelMinutes } from '../../store/useItineraryStore';
import { useDestinationsStore } from '../../store/useDestinationsStore';
import { getTripWeatherForecast } from '../../services/weatherApi';
import { predictDisasterRisk } from '../../utils/EdgeInference';

const { width } = Dimensions.get('window');

// Risk color helper
function riskColor(risk: string): string {
  switch (risk) {
    case 'Critical': return Colors.riskCritical;
    case 'High': return Colors.riskHigh;
    case 'Moderate': return Colors.riskModerate;
    case 'Low': return Colors.riskLow;
    default: return Colors.riskSafe;
  }
}

const TIME_PERIODS = [
  { key: 'tomorrow', label: 'Tomorrow', days: 1, icon: 'sunny-outline' as const },
  { key: 'next_week', label: 'Next Week', days: 7, icon: 'calendar-outline' as const },
  { key: 'next_month', label: 'Next Month', days: 30, icon: 'calendar' as const },
  { key: '3_months', label: 'In 3 Months', days: 90, icon: 'time-outline' as const },
];

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MyTripScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const destinations = useDestinationsStore(s => s.destinations);

  const {
    currentItinerary,
    allItineraries,
    loading,
    loadOrCreateItinerary,
    createNewItinerary,
    switchItinerary,
    renameItinerary,
    deleteItinerary,
    removeStop,
    reorderStops,
    updateTripAnalysis,
  } = useItineraryStore();

  const [showTripsModal, setShowTripsModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // Beautiful confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor: string;
    confirmText: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', icon: 'alert-circle-outline', iconColor: colors.danger, confirmText: 'Confirm', onConfirm: () => {} });

  const showConfirm = (opts: { title: string; message: string; icon?: string; iconColor?: string; confirmText?: string; onConfirm: () => void }) => {
    setConfirmDialog({
      visible: true,
      title: opts.title,
      message: opts.message,
      icon: opts.icon || 'alert-circle-outline',
      iconColor: opts.iconColor || colors.danger,
      confirmText: opts.confirmText || 'Confirm',
      onConfirm: opts.onConfirm,
    });
  };

  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('next_week');
  const [analysisResult, setAnalysisResult] = useState<{
    avgRisk: string;
    totalTravel: number;
    periodLabel: string;
    tripDateStr: string;
    stopResults: { name: string; risk: string; temp: number; precip: number }[];
  } | null>(null);

  // Load itinerary whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadOrCreateItinerary();
    }, [])
  );

  // Enrich stops with destination data
  const enrichedStops = (currentItinerary?.stops || []).map(stop => {
    const dest = destinations.find(d => d.id === stop.destination_id);
    return { ...stop, destination: dest || stop.destination };
  });

  const totalTravelMinutes = enrichedStops.reduce(
    (acc, s) => acc + (s.travel_minutes_to_next || 0),
    0
  );

  const handleMoveUp = (index: number) => {
    if (index > 0) reorderStops(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < enrichedStops.length - 1) reorderStops(index, index + 1);
  };

  const handleRemove = (stopId: string, name: string) => {
    showConfirm({
      title: 'Remove Stop',
      message: `Remove ${name} from your itinerary?`,
      icon: 'close-circle-outline',
      iconColor: colors.danger,
      confirmText: 'Remove',
      onConfirm: () => removeStop(stopId),
    });
  };

  const handleAnalyzeTrip = async () => {
    if (enrichedStops.length < 2) {
      Alert.alert('Add More Stops', 'Please add at least 2 destinations to analyze your full trip.');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const stopResults: { name: string; risk: string; temp: number; precip: number }[] = [];
      let totalRiskScore = 0;

      // Use the selected time period
      const period = TIME_PERIODS.find(p => p.key === selectedPeriod) || TIME_PERIODS[1];
      const tripDate = new Date();
      tripDate.setDate(tripDate.getDate() + period.days);
      const tripDateStr = tripDate.toISOString().split('T')[0];

      for (const stop of enrichedStops) {
        const dest = stop.destination;
        if (!dest?.latitude || !dest?.longitude) continue;

        try {
          const weather = await getTripWeatherForecast(
            dest.latitude,
            dest.longitude,
            tripDateStr
          );

          if (weather) {
            // Calculate Anomaly
            const baselines = require('../../utils/historical_baselines.json');
            const month = tripDate.getMonth() + 1;
            let avgPrecip = 0;
            if (baselines['_FALLBACK_'] && baselines['_FALLBACK_'][month.toString()]) {
              avgPrecip = baselines['_FALLBACK_'][month.toString()].avg_precip;
            }
            const precip_anomaly = weather.precip - (avgPrecip / 30);
          
            const risk = predictDisasterRisk(weather.temp, weather.precip, weather.wind, 50, precip_anomaly);
            const riskValues: Record<string, number> = {
              Safe: 0, Low: 1, Moderate: 2, High: 3, Critical: 4,
            };
            totalRiskScore += riskValues[risk] || 0;

            stopResults.push({
              name: dest.name,
              risk,
              temp: weather.temp,
              precip: weather.precip,
            });
          } else {
            stopResults.push({
              name: dest.name,
              risk: 'Low',
              temp: 28,
              precip: 0,
            });
          }
        } catch {
          stopResults.push({
            name: dest.name,
            risk: 'Low',
            temp: 28,
            precip: 0,
          });
        }
      }

      const avgRiskIdx = stopResults.length > 0 ? Math.round(totalRiskScore / stopResults.length) : 0;
      const riskLabels = ['Safe', 'Low', 'Moderate', 'High', 'Critical'];
      const avgRisk = riskLabels[Math.min(avgRiskIdx, 4)];

      setAnalysisResult({
        avgRisk,
        totalTravel: totalTravelMinutes,
        periodLabel: period.label,
        tripDateStr,
        stopResults,
      });

      await updateTripAnalysis(totalRiskScore, totalTravelMinutes);
    } catch (err) {
      console.error('Analysis error:', err);
      Alert.alert('Error', 'Failed to analyze the trip. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewDestination = (stop: any) => {
    if (stop.destination) {
      navigation.navigate('Plan', {
        screen: 'DestinationDetail',
        params: {
          id: stop.destination.id,
          name: stop.destination.name,
        },
      });
    }
  };

  if (loading && !currentItinerary) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading your trip...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <LinearGradient
            colors={[colors.primary, colors.background]}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerLabel}>CLIMALENS</Text>
              
              <TouchableOpacity 
                style={styles.titleSelector} 
                onPress={() => setShowTripsModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {currentItinerary?.title || 'My Trip'}
                </Text>
                <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              
              <Text style={styles.headerSubtitle}>
                {enrichedStops.length === 0
                  ? 'Start building your Sri Lanka adventure'
                  : `${enrichedStops.length} destination${enrichedStops.length > 1 ? 's' : ''} · ${formatMinutes(totalTravelMinutes)} total travel`}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Empty State */}
        {enrichedStops.length === 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="map-outline" size={64} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('myTrip.noDestinations', 'No Destinations Yet')}</Text>
            <Text style={styles.emptyDesc}>
              {t('myTrip.noDestinationsDesc', 'Go to "Plan a Trip", find destinations you love, and tap the')}{' '}
              <Ionicons name="add-circle" size={16} color={colors.accent} /> button to add them here!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Plan')}
              activeOpacity={0.8}
            >
              <Ionicons name="compass-outline" size={20} color={colors.background} />
              <Text style={styles.emptyButtonText}>{t('explore.findDestinations', 'Find Destinations')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Timeline */}
        {enrichedStops.length > 0 && (
          <View style={styles.timelineSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Route</Text>
              <TouchableOpacity onPress={() => {
                showConfirm({
                  title: 'Clear Route',
                  message: 'Remove all stops from this trip? This cannot be undone.',
                  icon: 'trash-outline',
                  iconColor: colors.danger,
                  confirmText: 'Clear All',
                  onConfirm: async () => {
                    for (const stop of enrichedStops) {
                      await removeStop(stop.id);
                    }
                  },
                });
              }}>
                <Text style={styles.clearButton}>Clear All Stops</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeline}>
              {enrichedStops.map((stop, index) => (
                <Animated.View
                  key={stop.id}
                  entering={FadeInDown.delay(index * 100)}
                  layout={Layout.springify()}
                >
                  {/* Stop Card */}
                  <View style={styles.stopCard}>
                    {/* Timeline dot & line */}
                    <View style={styles.timelineDotCol}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: index === 0 ? colors.accent : colors.accentMuted },
                      ]}>
                        <Text style={styles.stopNumber}>{index + 1}</Text>
                      </View>
                      {index < enrichedStops.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>

                    {/* Card Content */}
                    <TouchableOpacity
                      style={styles.stopContent}
                      onPress={() => handleViewDestination(stop)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stopHeader}>
                        <View style={styles.stopInfo}>
                          <Text style={styles.stopName}>
                            {stop.destination?.name || 'Unknown'}
                          </Text>
                          <Text style={styles.stopDistrict}>
                            <Ionicons name="location" size={12} color={colors.textSecondary} />
                            {' '}{stop.destination?.district || ''}
                          </Text>
                        </View>

                        {/* Reorder & Remove */}
                        <View style={styles.stopActions}>
                          {index > 0 && (
                            <TouchableOpacity
                              onPress={() => handleMoveUp(index)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="chevron-up" size={18} color={colors.accent} />
                            </TouchableOpacity>
                          )}
                          {index < enrichedStops.length - 1 && (
                            <TouchableOpacity
                              onPress={() => handleMoveDown(index)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="chevron-down" size={18} color={colors.accent} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleRemove(stop.id, stop.destination?.name || '')}
                            style={styles.actionBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Tags */}
                      <View style={styles.stopTags}>
                        {(stop.destination?.tags || []).slice(0, 3).map((tag, i) => (
                          <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>
                              {tag.replace('interests.', '')}
                            </Text>
                          </View>
                        ))}
                        {stop.destination?.temp && (
                          <View style={[styles.tag, { borderColor: colors.accentMuted }]}>
                            <Ionicons name="thermometer-outline" size={10} color={colors.accentMuted} />
                            <Text style={[styles.tagText, { color: colors.accentMuted }]}>
                              {stop.destination.temp}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Travel Connector */}
                  {index < enrichedStops.length - 1 && stop.travel_minutes_to_next > 0 && (
                    <View style={styles.travelConnector}>
                      <View style={styles.travelDotCol}>
                        <View style={styles.travelDottedLine} />
                      </View>
                      <View style={styles.travelBadge}>
                        <Ionicons name="car-outline" size={14} color={colors.accentMuted} />
                        <Text style={styles.travelText}>
                          ~{formatMinutes(stop.travel_minutes_to_next)} drive
                        </Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              ))}
            </View>

            {/* Time Period Selector */}
            <Animated.View entering={FadeInDown.delay(enrichedStops.length * 100 + 100)}>
              <Text style={styles.periodTitle}>When are you traveling?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.periodScroll}
                contentContainerStyle={styles.periodContainer}
              >
                {TIME_PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodChip,
                      selectedPeriod === period.key && styles.periodChipActive,
                    ]}
                    onPress={() => {
                      setSelectedPeriod(period.key);
                      setAnalysisResult(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={period.icon}
                      size={16}
                      color={selectedPeriod === period.key ? colors.background : colors.accent}
                    />
                    <Text
                      style={[
                        styles.periodChipText,
                        selectedPeriod === period.key && styles.periodChipTextActive,
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Analyze Full Trip Button */}
            <Animated.View entering={FadeInDown.delay(enrichedStops.length * 100 + 200)}>
              <TouchableOpacity
                style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
                onPress={handleAnalyzeTrip}
                disabled={analyzing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accentMuted]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.analyzeGradient}
                >
                  {analyzing ? (
                    <>
                      <ActivityIndicator size="small" color={colors.background} />
                      <Text style={styles.analyzeText}>Analyzing Trip...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="analytics" size={22} color={colors.background} />
                      <Text style={styles.analyzeText}>
                        {t('myTrip.analyzeTrip', 'Analyze Trip...')}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.background} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Analysis Results */}
            {analysisResult && (
              <Animated.View entering={FadeInDown.duration(600)} style={styles.analysisCard}>
                <LinearGradient
                  colors={[colors.card, colors.surface]}
                  style={styles.analysisGradient}
                >
                  <Text style={styles.analysisTitle}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                    {'  '}{t('myTrip.tripSafetyReport', 'Trip Safety Report')}
                  </Text>
                  <View style={styles.reportDateBadge}>
                    <Ionicons name="calendar" size={14} color={colors.accent} />
                    <Text style={styles.reportDateText}>
                      {analysisResult.periodLabel} · {analysisResult.tripDateStr}
                    </Text>
                  </View>

                  {/* Summary Row */}
                  <View style={styles.analysisSummary}>
                    <View style={styles.summaryItem}>
                      <Ionicons name="speedometer" size={28} color={riskColor(analysisResult.avgRisk)} />
                      <Text style={[styles.summaryValue, { color: riskColor(analysisResult.avgRisk) }]}>
                        {analysisResult.avgRisk}
                      </Text>
                      <Text style={styles.summaryLabel}>{t('myTrip.overallRisk', 'Overall Risk')}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="car" size={28} color={colors.accentMuted} />
                      <Text style={styles.summaryValue}>
                        {formatMinutes(analysisResult.totalTravel)}
                      </Text>
                      <Text style={styles.summaryLabel}>{t('myTrip.totalDrive', 'Total Drive')}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Ionicons name="flag" size={28} color={colors.accent} />
                      <Text style={styles.summaryValue}>
                        {analysisResult.stopResults.length}
                      </Text>
                      <Text style={styles.summaryLabel}>{t('myTrip.stops', 'Stops')}</Text>
                    </View>
                  </View>

                  {/* Per-Stop Results */}
                  <Text style={styles.perStopTitle}>{t('myTrip.perStopBreakdown', 'Per-Stop Breakdown')}</Text>
                  {analysisResult.stopResults.map((sr, i) => (
                    <View key={i} style={styles.perStopRow}>
                      <View style={styles.perStopLeft}>
                        <View style={[styles.riskDot, { backgroundColor: riskColor(sr.risk) }]} />
                        <Text style={styles.perStopName} numberOfLines={2}>{sr.name}</Text>
                      </View>
                      <View style={styles.perStopRight}>
                        <Text style={styles.perStopTemp}>{sr.temp.toFixed(0)}°C</Text>
                        <Text style={styles.perStopPrecip}>{sr.precip.toFixed(0)}mm</Text>
                        <Text style={[styles.perStopRisk, { color: riskColor(sr.risk) }]}>
                          {sr.risk}
                        </Text>
                      </View>
                    </View>
                  ))}
                  
                  <View style={styles.analysisDisclaimer}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.analysisDisclaimerText}>
                      Weather and risk levels shown are specifically predicted for the selected date ({analysisResult.tripDateStr}). Risk changes by season.
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Trips Management Modal */}
      <Modal
        visible={showTripsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTripsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('myTrip.yourTrips', 'Your Trips')}</Text>
              <TouchableOpacity onPress={() => setShowTripsModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {allItineraries.map((trip) => {
                const isCurrent = currentItinerary?.id === trip.id;
                const isEditing = editingTripId === trip.id;

                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.tripItem, isCurrent && styles.tripItemActive]}
                    onPress={() => {
                      if (!isEditing) {
                        switchItinerary(trip.id);
                        setShowTripsModal(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tripItemLeft}>
                      <View style={[styles.tripIconContainer, isCurrent && { backgroundColor: colors.accent + '20' }]}>
                        <Ionicons 
                          name={isCurrent ? "map" : "map-outline"} 
                          size={20} 
                          color={isCurrent ? colors.accent : colors.textSecondary} 
                        />
                      </View>
                      
                      {isEditing ? (
                        <TextInput
                          style={styles.tripRenameInput}
                          value={editTitleText}
                          onChangeText={setEditTitleText}
                          autoFocus
                          onSubmitEditing={async () => {
                            if (editTitleText.trim()) {
                              await renameItinerary(trip.id, editTitleText.trim());
                            }
                            setEditingTripId(null);
                          }}
                          onBlur={() => setEditingTripId(null)}
                        />
                      ) : (
                        <View>
                          <Text style={[styles.tripItemTitle, isCurrent && { color: colors.accent }]}>
                            {trip.title}
                          </Text>
                          <Text style={styles.tripItemSub}>
                            {new Date(trip.created_at || Date.now()).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.tripItemActions}>
                      {!isEditing && (
                        <TouchableOpacity
                          style={styles.tripActionBtn}
                          onPress={() => {
                            setEditTitleText(trip.title);
                            setEditingTripId(trip.id);
                          }}
                        >
                          <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                      
                      {allItineraries.length > 1 && (
                        <TouchableOpacity
                          style={styles.tripActionBtn}
                          onPress={() => setTripToDelete(trip.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.createNewBtn}
              onPress={async () => {
                await createNewItinerary('New ClimaLens Trip');
                setShowTripsModal(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.background} />
              <Text style={styles.createNewBtnText}>{t('myTrip.createNewTrip', 'Create New Trip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Beautiful Delete Confirmation Modal */}
      <Modal
        visible={!!tripToDelete}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTripToDelete(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-bin-outline" size={32} color={colors.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Trip?</Text>
            <Text style={styles.deleteModalDesc}>Are you sure you want to permanently delete this trip? This action cannot be undone.</Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setTripToDelete(null)}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmBtn} 
                onPress={() => {
                  if (tripToDelete) {
                    deleteItinerary(tripToDelete);
                    setTripToDelete(null);
                  }
                }}
              >
                <Text style={styles.deleteConfirmText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Beautiful Confirm Dialog */}
      <Modal
        visible={confirmDialog.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.deleteModalContent}>
            <View style={[styles.deleteIconContainer, { backgroundColor: confirmDialog.iconColor + '15' }]}>
              <Ionicons name={confirmDialog.icon as any} size={32} color={confirmDialog.iconColor} />
            </View>
            <Text style={styles.deleteModalTitle}>{confirmDialog.title}</Text>
            <Text style={styles.deleteModalDesc}>{confirmDialog.message}</Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteCancelBtn} 
                onPress={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmBtn} 
                onPress={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, visible: false }));
                }}
              >
                <Text style={styles.deleteConfirmText}>{confirmDialog.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  headerContent: {},
  headerLabel: {
    color: colors.accent,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h1,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent + '20',
  },
  emptyTitle: {
    ...Typography.h2,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  emptyButtonText: {
    color: colors.background,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },

  // Custom Delete Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: width * 0.85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  deleteModalTitle: {
    ...Typography.h2,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  deleteModalDesc: {
    ...Typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  deleteCancelText: {
    ...Typography.button,
    color: colors.textPrimary,
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  deleteConfirmText: {
    ...Typography.button,
    color: '#fff',
  },

  // Timeline Section
  timelineSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: colors.textPrimary,
  },
  clearButton: {
    color: colors.danger,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  timeline: {
    marginBottom: Spacing.xl,
  },

  // Stop Card
  stopCard: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  timelineDotCol: {
    width: 36,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stopNumber: {
    color: colors.background,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.glassBorder,
    marginTop: -2,
  },
  stopContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  stopDistrict: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
  },
  stopTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: colors.accent,
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    textTransform: 'capitalize',
  },

  // Travel Connector
  travelConnector: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    height: 36,
  },
  travelDotCol: {
    width: 36,
    alignItems: 'center',
  },
  travelDottedLine: {
    width: 2,
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentMuted + '40',
    borderStyle: 'dashed',
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: Spacing.sm,
    backgroundColor: colors.accentMuted + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
  },
  travelText: {
    color: colors.accentMuted,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },

  // Analyze Button
  analyzeButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(74, 222, 128, 0.25)',
      } as any,
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  analyzeText: {
    color: colors.background,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },

  // Analysis Results
  analysisCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  analysisGradient: {
    padding: Spacing.lg,
  },
  analysisTitle: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: Spacing.lg,
  },
  analysisSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glassBorder,
  },
  perStopTitle: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  perStopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  perStopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  perStopName: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    flexShrink: 1,
  },
  perStopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  perStopTemp: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  perStopRisk: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    minWidth: 70,
    textAlign: 'right',
  },
  perStopPrecip: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },

  // Time Period Selector
  periodTitle: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  periodScroll: {
    marginBottom: Spacing.lg,
  },
  periodContainer: {
    gap: Spacing.sm,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    backgroundColor: colors.surface,
  },
  periodChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  periodChipText: {
    color: colors.accent,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  periodChipTextActive: {
    color: colors.background,
  },

  // Report Date Badge
  reportDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent + '12',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  reportDateText: {
    color: colors.accent,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },

  // Multi-Trip Modal Styles
  titleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface + '60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: 4,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: Spacing.md,
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tripItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  tripItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  tripIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripItemTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tripItemSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  tripRenameInput: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 0,
    flex: 1,
  },
  tripItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tripActionBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    gap: 8,
  },
  createNewBtnText: {
    color: colors.background,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  analysisDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  analysisDisclaimerText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  }
});
