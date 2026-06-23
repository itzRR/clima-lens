// ClimaLens — Welcome Screen (Onboarding + Auth Entry)
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming,
  Easing, interpolate, useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    icon: 'earth' as const,
    gradient: ['#0F3D2E', '#1B5E20'] as const,
    titleKey: 'onboarding.slide1Title',
    subKey: 'onboarding.slide1Sub',
    features: ['Real-time weather data', 'Risk predictions', 'Climate analytics'],
  },
  {
    icon: 'airplane' as const,
    gradient: ['#1B5E20', '#065F46'] as const,
    titleKey: 'onboarding.slide2Title',
    subKey: 'onboarding.slide2Sub',
    features: ['Smart recommendations', 'Travel scoring', 'Season analysis'],
  },
  {
    icon: 'shield-checkmark' as const,
    gradient: ['#065F46', '#0F3D2E'] as const,
    titleKey: 'onboarding.slide3Title',
    subKey: 'onboarding.slide3Sub',
    features: ['Community reports', 'Push alerts', 'Live updates'],
  },
];

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { setOnboarded, setGuest } = useSettingsStore();

  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleGetStarted = () => {
    setOnboarded(true);
    setGuest(true);
    onComplete();
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const renderSlide = ({ item, index }: { item: typeof ONBOARDING_SLIDES[0]; index: number }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[...item.gradient, Colors.background]}
        style={styles.slideGradient}
      >
        {/* Icon */}
        <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.emojiContainer}>
          <Ionicons name={item.icon} size={56} color={Colors.accent} />
        </Animated.View>

        {/* Content */}
        <View style={styles.slideContent}>
          <Text style={styles.slideTitle}>{t(item.titleKey)}</Text>
          <Text style={styles.slideSub}>{t(item.subKey)}</Text>

          {/* Feature chips */}
          <View style={styles.featureRow}>
            {item.features.map((f, i) => (
              <View key={i} style={styles.featureChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(_, i) => i.toString()}
      />

      {/* Bottom section */}
      <Animated.View entering={FadeInUp.delay(600).duration(800)} style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* CTA Buttons */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.accent, '#2DD4BF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1 ? t('auth.getStarted') : t('common.next')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.textInverse} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip / Guest */}
        <TouchableOpacity onPress={handleGetStarted} style={styles.skipBtn}>
          <Text style={styles.skipText}>
            {currentIndex === ONBOARDING_SLIDES.length - 1 ? t('auth.continueAsGuest') : t('common.skip')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bigEmoji: {
    fontSize: 56,
  },
  slideContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  slideTitle: {
    ...Typography.hero,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  slideSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  featureRow: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.background,
    paddingTop: Spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
  },
  ctaBtnText: {
    ...Typography.button,
    color: Colors.textInverse,
    fontSize: 17,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    ...Typography.bodyMedium,
    color: Colors.textTertiary,
  },
});
