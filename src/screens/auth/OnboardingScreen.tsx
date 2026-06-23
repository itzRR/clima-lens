import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'What is ClimaLens?',
    description: 'An AI-powered climate risk prediction and travel intelligence platform. We combine satellite data, historical records, and community reports to keep you safe.',
    icon: 'globe-outline',
  },
  {
    id: '2',
    title: 'Two Modes, One Platform',
    description: 'Choose SriSafe Mode to plan a weather-resilient vacation, or DIWASA Mode to access deep climate risk analytics and historical disaster replays.',
    icon: 'git-compare-outline',
  },
  {
    id: '3',
    title: 'Choose Your Language',
    description: 'ClimaLens is fully accessible in English, Sinhala, and Tamil. You can change this later in Settings.',
    icon: 'language-outline',
    isLanguageSelection: true,
  },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { language, setLanguage, setOnboarded } = useSettingsStore();
  const { t, i18n } = useTranslation();

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex); // Update explicitly for Web
    } else {
      setOnboarded(true);
      onComplete();
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'si' | 'ta') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={80} color={Colors.accent} />
        </View>
        <Text style={styles.title}>{t(`onboarding.slide${item.id}Title`, item.title)}</Text>
        <Text style={styles.description}>{t(`onboarding.slide${item.id}Sub`, item.description)}</Text>

        {item.isLanguageSelection && (
          <View style={styles.languageContainer}>
            {(['en', 'si', 'ta'] as const).map((lang) => {
              const labels = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' };
              const isActive = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.languageButton, isActive && styles.languageButtonActive]}
                  onPress={() => handleLanguageSelect(lang)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.languageText, isActive && styles.languageTextActive]}>
                    {labels[lang]}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.background} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
      />
      
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? t('auth.getStarted', 'Get Started') : t('common.next', 'Next')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingTop: height * 0.15,
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  title: {
    ...Typography.h1,
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
  languageContainer: {
    marginTop: Spacing.xl,
    width: '100%',
    gap: Spacing.sm,
  },
  languageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  languageButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  languageText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
  languageTextActive: {
    color: Colors.background,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl * 2,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  nextButtonText: {
    ...Typography.button,
    color: Colors.background,
  },
});
