import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MOCK_LINE_DATA = {
  labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  datasets: [
    {
      data: [20, 25, 30, 60, 90, 85, 40, 30, 50, 70, 95, 40], // Flood
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
      strokeWidth: 2,
    },
    {
      data: [10, 10, 15, 40, 70, 80, 20, 10, 30, 50, 80, 20], // Landslide
      color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Orange
      strokeWidth: 2,
    }
  ],
  legend: ['Flood Risk', 'Landslide Risk']
};

export default function DistrictDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const { name = 'Galle' } = route.params || {};

  // Mock Alert based on language
  const getAlertText = () => {
    switch(i18n.language) {
      case 'si': return 'අවධානය: ඉදිරි පැය 48 තුළ දැඩි වර්ෂාපතනයක් අපේක්ෂා කෙරේ. ගංවතුර අවදානම ඉහළයි.';
      case 'ta': return 'கவனம்: அடுத்த 48 மணி நேரத்தில் பலத்த மழை பெய்யக்கூடும். வெள்ள அபாயம் அதிகம்.';
      default: return 'ALERT: Heavy rainfall expected in the next 48 hours. High flood risk in low-lying areas.';
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{name} {t('map.district', 'District')}</Text>
      </View>

      <View style={styles.content}>
        {/* Active Alert Template */}
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={20} color={colors.background} />
            <Text style={styles.alertTitle}>{t('alerts.simulatedAdvisory', 'Simulated Advisory')}</Text>
          </View>
          <Text style={styles.alertText}>{getAlertText()}</Text>
          <Text style={styles.alertMeta}>{t('alerts.simulatedMeta', 'Based on Nov 12 Projections • Source: DMC')}</Text>
        </View>

        {/* 12-Month Risk Chart */}
        <Text style={styles.sectionTitle}>{t('risk.annualProfile', 'Annual Risk Profile')}</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={MOCK_LINE_DATA}
            width={width - Spacing.lg * 2 - Spacing.md * 2}
            height={220}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`,
              propsForDots: {
                r: '4',
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Ditwah Replay CTA */}
        <Text style={styles.sectionTitle}>{t('risk.historicalAnalysis', 'Historical Analysis')}</Text>
        <TouchableOpacity 
          style={styles.ditwahCard}
          onPress={() => navigation.navigate('DitwahReplay', { districtId: route.params?.districtId })}
        >
          <View style={styles.ditwahIcon}>
            <Ionicons name="water-outline" size={24} color={colors.background} />
          </View>
          <View style={styles.ditwahContent}>
            <Text style={styles.ditwahTitle}>{t('risk.ditwahReplay', 'Cyclone Ditwah Replay')}</Text>
            <Text style={styles.ditwahDesc}>{t('risk.ditwahDesc', 'See how the model predicted the November 2025 cyclone vs actual ground data.')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 4,
  },
  alertCard: {
    backgroundColor: colors.danger,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  alertTitle: {
    ...Typography.caption,
    color: colors.background,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  alertText: {
    ...Typography.body,
    color: colors.background,
    fontWeight: '600',
    lineHeight: 22,
  },
  alertMeta: {
    ...Typography.caption,
    color: colors.background + 'B3',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  chart: {
    borderRadius: BorderRadius.xl,
  },
  ditwahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    gap: Spacing.md,
  },
  ditwahIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ditwahContent: {
    flex: 1,
  },
  ditwahTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ditwahDesc: {
    ...Typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
