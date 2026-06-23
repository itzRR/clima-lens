import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Props {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { language, setLanguage } = useSettingsStore();
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();

  const handleNext = () => {
    if (currentSlide < 2) {
      scrollViewRef.current?.scrollTo({ x: width * (currentSlide + 1), animated: true });
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleSkip = () => {
    scrollViewRef.current?.scrollTo({ x: width * 2, animated: true });
    setCurrentSlide(2);
  };

  const handleLanguageSelect = (code: 'en' | 'si' | 'ta') => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    if (onComplete) onComplete();
  };

  const onScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== currentSlide) setCurrentSlide(slide);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        bounces={false}
        scrollEventThrottle={16}
      >
        {/* Slide 1 */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="map-outline" size={64} color={Colors.accent} />
            </View>
            <Text style={styles.title}>Sri Lanka's Climate Risk & Travel Companion</Text>
            <Text style={styles.description}>
              ClimaLens combines decades of rainfall, flood, and landslide data to help you travel smarter — and understand which areas need extra care during monsoon season.
            </Text>
          </View>
        </View>

        {/* Slide 2 */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <View style={styles.splitCards}>
              <View style={[styles.miniCard, { borderColor: Colors.accent }]}>
                <Ionicons name="compass-outline" size={32} color={Colors.accent} />
                <Text style={styles.miniCardTitle}>Plan a Trip</Text>
              </View>
              <View style={[styles.miniCard, { borderColor: Colors.danger }]}>
                <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
                <Text style={styles.miniCardTitle}>Risk Map</Text>
              </View>
            </View>
            <Text style={styles.title}>Plan Trips. Understand Risk.</Text>
            <Text style={styles.description}>
              <Text style={{fontWeight: 'bold'}}>Plan a Trip:</Text> Enter your travel month and interests. ClimaLens recommends the safest destinations.{"\n\n"}
              <Text style={{fontWeight: 'bold'}}>Risk Map:</Text> See historical climate risk by district, validated against Cyclone Ditwah (Nov 2025).
            </Text>
          </View>
        </View>

        {/* Slide 3 */}
        <View style={styles.slide}>
          <View style={styles.slideContent}>
            <Text style={styles.title}>Choose Your Language</Text>
            <Text style={styles.description}>You can change this anytime in Settings.</Text>
            
            <View style={styles.langList}>
              {[
                { code: 'en', label: 'English' },
                { code: 'si', label: 'සිංහල (Sinhala)' },
                { code: 'ta', label: 'தமிழ் (Tamil)' },
              ].map(lang => (
                <TouchableOpacity 
                  key={lang.code}
                  style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
                  onPress={() => handleLanguageSelect(lang.code as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="language-outline" size={22} color={language === lang.code ? Colors.accent : Colors.textSecondary} style={{ marginRight: Spacing.md }} />
                  <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>{lang.label}</Text>
                  {language === lang.code && <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Controls */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {[0, 1, 2].map(idx => (
            <View key={idx} style={[styles.dot, currentSlide === idx && styles.dotActive]} />
          ))}
        </View>

        {currentSlide < 2 ? (
          <View style={styles.navBtns}>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextText}>Next →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.startBtn} onPress={handleGetStarted}>
            <LinearGradient
              colors={[Colors.accent, '#22C55E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
            />
            <Text style={styles.startText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  slideContent: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  splitCards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl * 2,
  },
  miniCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  miniCardTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  langList: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  langBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '10',
  },
  langFlag: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  langText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  langTextActive: {
    color: Colors.accent,
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.glassBorder,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  navBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  nextText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  startBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    ...Typography.button,
    color: Colors.background,
  },
});
