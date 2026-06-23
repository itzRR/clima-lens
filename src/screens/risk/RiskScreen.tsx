// ClimaLens — Risk Intelligence Screen
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '../../components/common/GlassCard';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { fetchCurrentWeather } from '../../services/weatherService';
import { calculateRiskPrediction, calculateRiskScore } from '../../services/riskEngine';
import { WeatherData, RiskPrediction, RiskScore } from '../../types';
import { SRI_LANKA_CENTER, getRiskLevel, RISK_LEVELS } from '../../data/constants';

const RISK_GAUGES = [
  { key: 'floodRisk' as const, label: 'risk.floodRisk', icon: '🌊', colors: ['#3B82F6', '#1D4ED8'] },
  { key: 'landslideRisk' as const, label: 'risk.landslideRisk', icon: '⛰️', colors: ['#D97706', '#92400E'] },
  { key: 'rainfallRisk' as const, label: 'risk.rainfallRisk', icon: '🌧️', colors: ['#6366F1', '#4338CA'] },
  { key: 'heatRisk' as const, label: 'risk.heatRisk', icon: '🌡️', colors: ['#EF4444', '#B91C1C'] },
  { key: 'airQuality' as const, label: 'risk.airQuality', icon: '💨', colors: ['#22C55E', '#15803D'] },
];

function getRiskGaugeColor(score: number): string {
  if (score <= 20) return RISK_LEVELS.safe.color;
  if (score <= 40) return RISK_LEVELS.low.color;
  if (score <= 60) return RISK_LEVELS.moderate.color;
  if (score <= 80) return RISK_LEVELS.high.color;
  return RISK_LEVELS.critical.color;
}

function getRiskLevelLabel(score: number, t: any): string {
  if (score <= 20) return t('risk.safe');
  if (score <= 40) return t('risk.low');
  if (score <= 60) return t('risk.moderate');
  if (score <= 80) return t('risk.high');
  return t('risk.critical');
}

export function RiskScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [overallRisk, setOverallRisk] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('Colombo');

  useEffect(() => {
    loadRiskData();
  }, [selectedDistrict]);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      const weather = await fetchCurrentWeather(SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng);
      const pred = calculateRiskPrediction(weather, selectedDistrict);
      const risk = calculateRiskScore(weather, selectedDistrict);
      setPrediction(pred);
      setOverallRisk(risk);
    } catch {
      const pred = calculateRiskPrediction(null, selectedDistrict);
      const risk = calculateRiskScore(null, selectedDistrict);
      setPrediction(pred);
      setOverallRisk(risk);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !prediction || !overallRisk) {
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>{t('risk.title')}</Text>
          <Text style={styles.subtitle}>{t('risk.subtitle')}</Text>
        </Animated.View>

        {/* Overall Risk */}
        <Animated.View entering={FadeInDown.delay(150).duration(600)}>
          <GlassCard variant="accent" style={styles.overallCard}>
            <View style={styles.overallRow}>
              <ScoreGauge
                score={overallRisk.score}
                size={110}
                strokeWidth={9}
                color={overallRisk.color}
                label={t('risk.overallRisk')}
                sublabel={overallRisk.label}
                delay={300}
              />
              <View style={styles.overallInfo}>
                <Text style={styles.overallDistrict}>{selectedDistrict}</Text>
                <View style={styles.confidenceRow}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.accent} />
                  <Text style={styles.confidenceText}>
                    {t('risk.confidence')}: {Math.round(prediction.confidence * 100)}%
                  </Text>
                </View>
                <View style={styles.factorsPreview}>
                  {overallRisk.factors.slice(0, 3).map((f, i) => (
                    <View key={i} style={styles.factorRow}>
                      <View style={[styles.factorBar, { width: `${f.contribution * 2}%`, backgroundColor: overallRisk.color }]} />
                      <Text style={styles.factorName}>{f.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* 5 Risk Gauges */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <View style={styles.gaugesGrid}>
            {RISK_GAUGES.map((gauge, i) => {
              const score = prediction[gauge.key];
              const color = getRiskGaugeColor(score);
              return (
                <Animated.View key={gauge.key} entering={FadeInDown.delay(400 + i * 100).duration(500)}>
                  <GlassCard style={styles.gaugeCard}>
                    <Text style={styles.gaugeEmoji}>{gauge.icon}</Text>
                    <ScoreGauge
                      score={score}
                      size={80}
                      strokeWidth={6}
                      color={color}
                      label={t(gauge.label)}
                      sublabel={getRiskLevelLabel(score, t)}
                      delay={500 + i * 150}
                    />
                  </GlassCard>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Contributing Factors */}
        <Animated.View entering={FadeInDown.delay(800).duration(600)}>
          <Text style={styles.sectionTitle}>{t('risk.factors')}</Text>
          <GlassCard>
            {overallRisk.factors.map((factor, i) => (
              <View key={i} style={[styles.factorItem, i > 0 && styles.factorBorder]}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorItemName}>{factor.name}</Text>
                  <Text style={[styles.factorValue, { color: getRiskGaugeColor(factor.contribution * 3.3) }]}>
                    {Math.round(factor.contribution)}
                  </Text>
                </View>
                <Text style={styles.factorDesc}>{factor.description}</Text>
                <View style={styles.factorBarBg}>
                  <Animated.View
                    style={[
                      styles.factorBarFill,
                      {
                        width: `${Math.min(100, factor.contribution * 3.3)}%`,
                        backgroundColor: getRiskGaugeColor(factor.contribution * 3.3),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Prediction Legend */}
        <Animated.View entering={FadeInDown.delay(1000).duration(600)}>
          <GlassCard style={styles.legendCard}>
            <Text style={styles.legendTitle}>Risk Level Guide</Text>
            <View style={styles.legendGrid}>
              {Object.entries(RISK_LEVELS).map(([key, level]) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: level.color }]} />
                  <Text style={styles.legendLabel}>{level.label}</Text>
                  <Text style={styles.legendRange}>{level.min}-{level.max}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: Spacing.base, gap: Spacing.lg },
  header: { gap: 4 },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  // Overall card
  overallCard: { paddingVertical: Spacing.xl },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  overallInfo: { flex: 1, gap: Spacing.sm },
  overallDistrict: { ...Typography.h3, color: Colors.textPrimary },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confidenceText: { ...Typography.small, color: Colors.textSecondary },
  factorsPreview: { gap: 6, marginTop: 4 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorBar: { height: 3, borderRadius: 2, minWidth: 10 },
  factorName: { ...Typography.caption, color: Colors.textTertiary, fontSize: 10 },
  // Gauges grid
  gaugesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' },
  gaugeCard: { width: (Dimensions.get('window').width - 48 - 8) / 2, alignItems: 'center', paddingVertical: Spacing.base },
  gaugeEmoji: { fontSize: 24, marginBottom: 8 },
  // Factors
  factorItem: { paddingVertical: Spacing.md, gap: 6 },
  factorBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorItemName: { ...Typography.bodyBold, color: Colors.textPrimary },
  factorValue: { ...Typography.bodyBold },
  factorDesc: { ...Typography.small, color: Colors.textSecondary },
  factorBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 4 },
  factorBarFill: { height: 4, borderRadius: 2 },
  // Legend
  legendCard: { gap: Spacing.md },
  legendTitle: { ...Typography.overline, color: Colors.textSecondary },
  legendGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10 },
  legendRange: { ...Typography.caption, color: Colors.textTertiary, fontSize: 9 },
});

