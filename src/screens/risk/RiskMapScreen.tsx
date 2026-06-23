import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, ActivityIndicator, TextInput, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { ClimaMap } from '../../components/map/ClimaMap';

import { ScoreGauge } from '../../components/common/ScoreGauge';
import { LanguageSelectorSheet } from '../../components/common/LanguageSelectorSheet';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { DISTRICTS, getDistrictById } from '../../data/districts';
import { supabase } from '../../services/supabaseClient';
import { RiskScore } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper: Calculate the overall district color/risk based on real destinations
function aggregateDistrictRisk(districtName: string, allDests: any[]): { color: string, score: number, label: string } {
  const distDests = allDests.filter(d => d.district === districtName);
  
  if (distDests.length === 0) return { color: Colors.success, score: 95, label: 'Low Risk' };

  // Calculate averages from Supabase
  const avgRiskScore = distDests.reduce((sum, d) => sum + (d.risk_score || 0), 0) / distDests.length;
  
  // Find worst risk tier in the district
  const hasHigh = distDests.some(d => d.risk_tier === 'risk.high');
  const hasMod = distDests.some(d => d.risk_tier === 'risk.moderate');

  let color: string = Colors.success;
  let label: string = 'Low Risk';

  if (hasHigh) {
    color = Colors.danger;
    label = 'High Risk';
  } else if (hasMod) {
    color = Colors.warning;
    label = 'Moderate Risk';
  }

  return { color, score: avgRiskScore, label };
}

function DistrictBottomSheet({ district, allDests, onClose, insets }: {
  district: typeof DISTRICTS[0]; allDests: any[]; onClose: () => void; insets: any;
}) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  // Filter Supabase destinations for this district
  const distDestinations = allDests.filter(d => d.district === district.name);
  const districtRisk = aggregateDistrictRisk(district.name, allDests);
  
  // Get average Suitability Score for the dial
  const avgSuitability = distDestinations.length > 0 
    ? distDestinations.reduce((sum, d) => sum + (d.suitability_score || 0), 0) / distDestinations.length 
    : 95;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 60, 80) }]}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <TouchableOpacity activeOpacity={1} style={{ flexShrink: 1 }}>
              <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetName}>{district.name}</Text>
                <Text style={styles.sheetProvince}>{district.province} Province</Text>
              </View>
              <View style={[styles.sheetRiskBadge, { backgroundColor: districtRisk.color + '20' }]}>
                <View style={[styles.sheetRiskDot, { backgroundColor: districtRisk.color }]} />
                <Text style={[styles.sheetRiskLabel, { color: districtRisk.color }]}>{districtRisk.label}</Text>
              </View>
            </View>

            <View style={styles.sheetScores}>
              <ScoreGauge score={districtRisk.score} size={80} strokeWidth={6}
                color={districtRisk.color} label={t('risk.overallRisk')} delay={200} />
              <ScoreGauge score={avgSuitability} size={80} strokeWidth={6}
                color={colors.accent} label={t('home.travelScore')} delay={400} />
            </View>

            {distDestinations.length > 0 && (
              <View style={styles.sheetDests}>
                <Text style={styles.sheetSectionTitle}>{t('map.topDestinations')} - Live AI Data</Text>
                {distDestinations.slice(0, 5).map((d, idx) => (
                  <TouchableOpacity 
                    key={d.id || idx} 
                    style={styles.sheetDestItem}
                    onPress={() => {
                      onClose();
                      navigation.navigate('DestinationDetail', { id: d.id, name: d.name });
                    }}
                  >
                    <View style={styles.destLeft}>
                      <Ionicons name="location" size={16} color={d.risk_color || colors.accent} />
                      <Text style={styles.sheetDestName}>{d.name}</Text>
                    </View>
                    <View style={styles.destRight}>
                      <Text style={styles.destWeather}>{d.temp} | {d.weather}</Text>
                      <View style={[styles.miniScore, { backgroundColor: d.risk_color + '20' }]}>
                        <Text style={[styles.miniScoreText, { color: d.risk_color }]}>{d.suitability_score}/100</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md}}>
              <TouchableOpacity style={[styles.closeBtn, {flex: 1}]} onPress={() => {
                onClose();
                navigation.navigate('DistrictDetail', { districtId: district.id, name: district.name });
              }}>
                <Text style={styles.closeBtnText}>Full Detail →</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.closeBtn, {flex: 1, backgroundColor: colors.accent}]}
                onPress={() => {
                  onClose();
                  navigation.navigate('DitwahReplay', { districtId: district.id });
                }}
              >
                <Text style={[styles.closeBtnText, {color: colors.background}]}>Ditwah Replay →</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.closeBtn, {backgroundColor: 'transparent', marginTop: Spacing.sm}]} onPress={onClose}>
              <Text style={[styles.closeBtnText, {color: colors.textSecondary}]}>Close</Text>
            </TouchableOpacity>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function RiskMapScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [destinationsData, setDestinationsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [riskFilter, setRiskFilter] = useState<'All' | 'Low' | 'Moderate' | 'High'>('All');
  const [showLangSheet, setShowLangSheet] = useState(false);

  const filteredDestinations = destinationsData.filter(d => {
    // First apply risk filter
    if (riskFilter !== 'All') {
      const isLow = d.risk_tier === 'risk.low';
      const isMod = d.risk_tier === 'risk.moderate';
      const isHigh = d.risk_tier === 'risk.high';
      if (riskFilter === 'Low' && !isLow) return false;
      if (riskFilter === 'Moderate' && !isMod) return false;
      if (riskFilter === 'High' && !isHigh) return false;
    }

    if (searchQuery.length === 0) return true; // Show all (filtered by risk) if no search
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.district?.toLowerCase().includes(q)
    );
  });

  // Connect Map to Supabase
  useEffect(() => {
    const fetchDests = async () => {
      const { data, error } = await supabase.from('destinations').select('*');
      if (data) {
        setDestinationsData(data);
      }
      setLoading(false);
    };
    fetchDests();
    
    // Listen for live updates from FastAPI!
    const sub = supabase.channel('dests').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'destinations' }, (payload) => {
      setDestinationsData(current => current.map(d => d.id === payload.new.id ? payload.new : d));
    }).subscribe();
    
    return () => { supabase.removeChannel(sub); };
  }, []);

  const getDistrictColor = useCallback((id: string): string => {
    const district = getDistrictById(id);
    if (!district) return 'rgba(255,255,255,0.05)';
    
    // Real Aggregated Color from Supabase!
    const risk = aggregateDistrictRisk(district.name, destinationsData);
    return risk.color + '40';
  }, [destinationsData]);

  const handleDistrictPress = (id: string) => {
    setSelectedDistrict(id);
    setShowSheet(true);
  };

  const selectedDistrictData = selectedDistrict ? getDistrictById(selectedDistrict) : null;

  const handleSearchSelect = (dest: any) => {
    setSearchQuery('');
    setShowSearchResults(false);
    // Navigate directly to the specific destination details instead of the district sheet
    navigation.navigate('DestinationDetail', { id: dest.id, name: dest.name });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('map.title')}</Text>
          <Text style={styles.subtitle}>{loading ? "Syncing live AI Data..." : t('map.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowLangSheet(true)} style={{ padding: Spacing.sm }}>
          <Ionicons name="language" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('map.searchPlaceholder', 'Search any location...')}
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSearchResults(text.length > 0);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchResults(false); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.length > 0 && filteredDestinations.length > 0 && (
          <View style={styles.searchResults}>
            {filteredDestinations.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.searchResultItem}
                onPress={() => handleSearchSelect(item)}
              >
                <Ionicons name="location" size={16} color={item.risk_color || Colors.accent} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultDistrict}>{item.district} • {item.temp} • {item.weather}</Text>
                </View>
                <View style={[styles.searchResultBadge, { backgroundColor: (item.risk_color || Colors.accent) + '20' }]}>
                  <Text style={[styles.searchResultScore, { color: item.risk_color || Colors.accent }]}>{item.suitability_score}/100</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Risk Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Low', 'Moderate', 'High'].map(filter => {
            const isSelected = riskFilter === filter;
            const colors: Record<string, string> = { All: Colors.textSecondary, Low: Colors.success, Moderate: Colors.warning, High: Colors.danger };
            const activeColor = colors[filter];

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSelected && { backgroundColor: activeColor + '15', borderColor: activeColor }]}
                onPress={() => setRiskFilter(filter as any)}
              >
                {filter !== 'All' && <View style={[styles.filterDot, { backgroundColor: activeColor }]} />}
                <Text style={[styles.filterText, isSelected && { color: activeColor, fontWeight: '700' }]}>
                  {filter} Risk
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent} />
        ) : (
          <ClimaMap 
            destinations={filteredDestinations} 
            onDistrictSelect={handleDistrictPress}
            onDestinationSelect={(id, name) => navigation.navigate('DestinationDetail' as any, { id, name } as any)}
          />
        )}
      </View>

      {/* District list */}
      <View style={[styles.districtListContainer, { bottom: insets.bottom + 100 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.districtListContent}>
          {DISTRICTS.map(d => {
            const risk = aggregateDistrictRisk(d.name, destinationsData);
            const isSelected = selectedDistrict === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => handleDistrictPress(d.id)}
                style={[styles.districtChip, isSelected && styles.districtChipActive]}
              >
                <View style={[styles.chipDot, { backgroundColor: risk.color }]} />
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {d.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <LanguageSelectorSheet 
        visible={showLangSheet} 
        onClose={() => setShowLangSheet(false)} 
      />

      {/* Bottom Sheet */}
      {showSheet && selectedDistrictData && (
        <DistrictBottomSheet
          district={selectedDistrictData}
          allDests={destinationsData}
          onClose={() => setShowSheet(false)}
          insets={insets}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: Spacing.base, gap: 4, marginBottom: Spacing.sm },
  title: { ...Typography.h1, color: colors.textPrimary },
  subtitle: { ...Typography.body, color: colors.textSecondary },
  searchWrapper: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    ...Typography.bodyMedium,
    color: colors.textPrimary,
  },
  searchResultDistrict: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  searchResultScore: {
    ...Typography.caption,
    fontWeight: '700',
  },
  filterScroll: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.card,
    gap: 6,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  mapContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  svgMap: { width: '100%', height: '100%', maxHeight: SCREEN_HEIGHT * 0.55 },
  districtListContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  districtListContent: { paddingHorizontal: Spacing.base, gap: 8 },
  districtChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.glassBorder,
  },
  districtChipActive: {
    backgroundColor: colors.accentGlow, borderColor: colors.accent,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { ...Typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  // Bottom sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  bottomSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'], padding: Spacing.lg,
    paddingBottom: 40, maxHeight: SCREEN_HEIGHT * 0.85,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  sheetName: { ...Typography.h2, color: colors.textPrimary },
  sheetProvince: { ...Typography.small, color: colors.textSecondary, marginTop: 4 },
  sheetRiskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  sheetRiskDot: { width: 8, height: 8, borderRadius: 4 },
  sheetRiskLabel: { ...Typography.caption, fontWeight: '700' },
  sheetScores: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginBottom: Spacing.lg, paddingVertical: Spacing.base,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sheetDests: { flexShrink: 1, marginBottom: Spacing.lg },
  sheetSectionTitle: { ...Typography.overline, color: colors.textSecondary, marginBottom: 8 },
  sheetDestItem: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8
  },
  destLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  destRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  sheetDestName: { ...Typography.bodyMedium, color: colors.textPrimary },
  destWeather: { ...Typography.caption, color: colors.textSecondary },
  miniScore: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  miniScoreText: { ...Typography.caption, fontWeight: '700' },
  closeBtn: {
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 16
  },
  closeBtnText: { ...Typography.button, color: colors.textSecondary },
});
