import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDestinationsStore, Destination } from '../../store/useDestinationsStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const { destinations, loading, error, fetchDestinations, subscribeToDestinations, unsubscribeFromDestinations } = useDestinationsStore();

  const month = route.params?.month || 1;
  const interests: string[] = route.params?.interests || [];

  useEffect(() => {
    fetchDestinations();
    subscribeToDestinations();
    return () => unsubscribeFromDestinations();
  }, []);

  // SMART ALGORITHM: Score and rank destinations based on DB optimal_months and tags
  const rankedDestinations = destinations.map(d => {
    let matchScore = 0;
    let matchReasons = [];
    
    // 1. Season Match (High weight now, driven by AI pre-calculated optimal_months)
    // Fallback: If optimal_months hasn't been generated in DB yet, don't penalize harshly
    if (d.optimal_months && d.optimal_months.length > 0) {
      if (d.optimal_months.includes(month)) {
        matchScore += 40;
        matchReasons.push(t('recommendations.bestSeason', 'Historical Best Season'));
      } else {
        matchScore -= 20; // Bad season
      }
    } else {
      // Fallback for missing AI data: guess based on coast
      const nameLower = d.name.toLowerCase();
      if ((nameLower.includes('beach') || nameLower.includes('bay')) && [12, 1, 2, 3].includes(month)) {
        matchScore += 10;
      }
    }
    
    // 2. Interest Match (High weight)
    if (interests.length > 0) {
      const matchedTags = interests.filter(i => d.tags && d.tags.includes(`interests.${i}`));
      if (matchedTags.length > 0) {
        matchScore += matchedTags.length * 30;
        matchReasons.push(t('recommendations.matchesInterests', 'Matches your interests'));
      } else {
        // If they requested interests but none match, penalize heavily
        matchScore -= 50; 
      }
    }
    
    // 3. Risk Penalties (Safety first)
    if (d.risk_tier === 'risk.high') {
      matchScore -= 40;
    } else if (d.risk_tier === 'risk.moderate') {
      matchScore -= 15;
    }
    
    // 4. Baseline DB Suitability (Low weight, acts as a tie-breaker)
    matchScore += (d.suitability_score * 0.2);
    
    return { ...d, matchScore, matchReasons };
  })
  .filter(d => d.matchScore > 0 || interests.length === 0) // Hide terrible matches
  .sort((a, b) => b.matchScore - a.matchScore); // Rank highest first

  const getMonthName = (m: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[m - 1];
    return t(`months.${monthName.toLowerCase()}`, monthName);
  };

  const renderCard = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(500)}>
      <TouchableOpacity 
        style={[styles.card, index === 0 && { borderColor: colors.accent, borderWidth: 1.5 }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DestinationDetail', { id: item.id, name: item.name })}
      >
        {/* Inner highlight */}
        <View style={styles.cardHighlight} />
        
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.accent : (index < 3 ? colors.accent + '20' : colors.surface) }]}>
              <Text style={[styles.rankText, { color: index === 0 ? colors.background : (index < 3 ? colors.accent : colors.textTertiary) }]}>
                #{index + 1}
              </Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.district} {t('common.district', 'District')}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: (item.risk_color || colors.accent) + '15', borderColor: (item.risk_color || colors.accent) + '30' }]}>
            <View style={[styles.badgeDot, { backgroundColor: item.risk_color }]} />
            <Text style={[styles.badgeText, { color: item.risk_color }]}>{t(item.risk_tier, 'Risk')}</Text>
          </View>
        </View>

        {item.matchReasons && item.matchReasons.length > 0 && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' }}>
            {item.matchReasons.map((reason: string, i: number) => (
              <View key={i} style={{ backgroundColor: colors.accent + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: colors.accent, fontWeight: '600' }}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="thermometer-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.statText}>{item.temp}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="partly-sunny-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.statText}>{item.weather}</Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>{t('recommendations.aiScore', 'AI Match Score')}</Text>
            <Text style={[styles.scoreValue, { color: item.matchScore > 60 ? colors.success : colors.warning }]}>
              {Math.round(item.matchScore > 100 ? 99 : item.matchScore)}%
            </Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View 
              style={[
                styles.scoreBarFill, 
                { width: `${Math.min(100, Math.max(0, item.matchScore))}%`, backgroundColor: item.matchScore > 60 ? colors.success : colors.warning }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textSecondary, marginTop: Spacing.md, fontSize: 16 }}>
            {t('recommendations.analyzing', 'Analyzing Database Matches...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={styles.title}>{t('plan.recommendations', 'Your Matches')}</Text>
          <Text style={styles.subtitle}>
            {getMonthName(month)} • {interests.map(i => t(`interests.${i}`, i)).join(', ')}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <Text style={{ color: colors.danger, textAlign: 'center' }}>{t('common.error', 'An error occurred')}: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={rankedDestinations}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }}>
              {t('explore.noResults', 'No destinations match your criteria')}
            </Text>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 120 }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TripMap')}
      >
        <LinearGradient
          colors={[colors.accent, '#22C55E']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
        />
        <Ionicons name="map-outline" size={22} color={colors.background} />
        <Text style={styles.fabText}>{t('map.title', 'View Map')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 5,
    gap: Spacing.md,
  },
  // --- Cards ---
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...Typography.caption,
    fontWeight: '800',
    fontSize: 12,
  },
  cardTitle: {
    ...Typography.h4,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
  },
  statText: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  scoreContainer: {
    gap: Spacing.xs,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    ...Typography.caption,
    color: colors.textTertiary,
  },
  scoreValue: {
    ...Typography.caption,
    fontWeight: '800',
  },
  scoreBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  // --- FAB ---
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)',
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
  fabText: {
    ...Typography.button,
    color: colors.background,
  },
});
