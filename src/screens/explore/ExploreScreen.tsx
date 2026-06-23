// ClimaLens — Explore Screen
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '../../components/common/GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { destinations } from '../../data/destinations';
import { INTEREST_CATEGORIES, MONTHS, getRiskLevel } from '../../data/constants';
import { generateDemoRiskScore, calculateTravelScore } from '../../services/riskEngine';

const { width } = Dimensions.get('window');

const CATEGORY_EMOJI: Record<string, string> = {
  beach: '🏖️', 'hill-country': '🏔️', cultural: '🏛️', wildlife: '🐘', adventure: '🏄',
};

export function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredDestinations = useMemo(() => {
    let results = [...destinations];
    // Filter by interest categories
    if (selectedInterests.length > 0) {
      const interestToCat: Record<string, string[]> = {
        beaches: ['beach'],
        surfing: ['beach', 'adventure'],
        wildlife: ['wildlife'],
        hiking: ['hill-country', 'adventure'],
        food: ['cultural', 'beach'],
        culture: ['cultural'],
        photography: ['hill-country', 'cultural', 'wildlife'],
      };
      const cats = new Set(selectedInterests.flatMap(i => interestToCat[i] || []));
      if (cats.size > 0) {
        results = results.filter(d => cats.has(d.category));
      }
    }
    return results;
  }, [selectedInterests]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Text style={styles.title}>{t('explore.title')}</Text>
          <Text style={styles.subtitle}>{t('explore.subtitle')}</Text>
        </Animated.View>

        {/* Month Picker */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text style={styles.sectionLabel}>{t('explore.pickMonth')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}
            contentContainerStyle={styles.monthScrollContent}>
            {MONTHS.map((month, i) => (
              <TouchableOpacity
                key={month}
                onPress={() => setSelectedMonth(i)}
                style={[styles.monthPill, selectedMonth === i && styles.monthPillActive]}
                accessibilityRole="button"
                accessibilityLabel={month}
              >
                <Text style={[styles.monthText, selectedMonth === i && styles.monthTextActive]}>
                  {month.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Interest Filters */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Text style={styles.sectionLabel}>{t('explore.interests')}</Text>
          <View style={styles.interestGrid}>
            {INTEREST_CATEGORIES.map(cat => {
              const isSelected = selectedInterests.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleInterest(cat.id)}
                  style={[styles.interestPill, isSelected && { backgroundColor: cat.color + '25', borderColor: cat.color }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={styles.interestIcon}>{cat.icon}</Text>
                  <Text style={[styles.interestText, isSelected && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {t('explore.results', { count: filteredDestinations.length })}
        </Text>

        {/* Destination Cards */}
        {filteredDestinations.map((dest, i) => {
          const risk = generateDemoRiskScore(dest.district);
          const travelScore = calculateTravelScore(risk.score, 70);
          return (
            <Animated.View key={dest.slug} entering={FadeInDown.delay(400 + i * 80).duration(500)}>
              <GlassCard noPadding style={styles.destCard}>
                {/* Header gradient */}
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.destImagePlaceholder}
                >
                  <Text style={styles.destEmoji}>
                    {CATEGORY_EMOJI[dest.category] || '🌴'}
                  </Text>
                  <View style={styles.destScoreBadge}>
                    <Text style={styles.destScoreValue}>{travelScore}</Text>
                    <Text style={styles.destScoreLabel}>Score</Text>
                  </View>
                </LinearGradient>

                <View style={styles.destContent}>
                  <View style={styles.destNameRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.destName}>{dest.name}</Text>
                      <Text style={styles.destProvince}>{dest.district}, {dest.province}</Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: risk.color + '20' }]}>
                      <View style={[styles.riskDot, { backgroundColor: risk.color }]} />
                      <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.destDesc} numberOfLines={2}>{dest.description}</Text>

                  <View style={styles.destMeta}>
                    <View style={styles.destMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.destMetaText}>{dest.bestTimeToVisit}</Text>
                    </View>
                    <View style={styles.destMetaItem}>
                      <Ionicons name="trending-up-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.destMetaText}>{dest.elevation}m</Text>
                    </View>
                  </View>

                  {/* Activity tags */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.tagRow}>
                      {dest.activities.slice(0, 4).map(a => (
                        <View key={a} style={styles.actTag}>
                          <Text style={styles.actTagText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </GlassCard>
            </Animated.View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.base, gap: Spacing.base },
  header: { paddingTop: Spacing.lg, gap: 4 },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  sectionLabel: { ...Typography.overline, color: Colors.textSecondary, marginBottom: Spacing.sm },
  monthScroll: { marginBottom: Spacing.sm },
  monthScrollContent: { gap: 8, paddingRight: Spacing.base },
  monthPill: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.glassBorder, backgroundColor: Colors.surface,
  },
  monthPillActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accent },
  monthText: { ...Typography.caption, color: Colors.textSecondary },
  monthTextActive: { color: Colors.accent, fontWeight: '700' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.glassBorder, backgroundColor: Colors.surface,
  },
  interestIcon: { fontSize: 16 },
  interestText: { ...Typography.caption, color: Colors.textSecondary },
  resultsCount: { ...Typography.small, color: Colors.textTertiary, marginTop: Spacing.sm },
  destCard: { marginBottom: Spacing.sm, overflow: 'hidden' },
  destImagePlaceholder: {
    height: 140, justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  destEmoji: { fontSize: 48, opacity: 0.6 },
  destScoreBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.md,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
  },
  destScoreValue: { ...Typography.h4, color: Colors.accent },
  destScoreLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 9 },
  destContent: { padding: Spacing.base, gap: Spacing.sm },
  destNameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  destName: { ...Typography.h3, color: Colors.textPrimary },
  destProvince: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { ...Typography.caption, fontWeight: '700' },
  destDesc: { ...Typography.body, color: Colors.textSecondary },
  destMeta: { flexDirection: 'row', gap: Spacing.lg },
  destMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  destMetaText: { ...Typography.small, color: Colors.textSecondary },
  tagRow: { flexDirection: 'row', gap: 6 },
  actTag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, backgroundColor: Colors.glassLight,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  actTagText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10 },
});
