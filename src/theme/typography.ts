// ClimaLens Typography System
import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'Inter',
});

const fontFamilyFallback = Platform.select({
  ios: 'SF Pro Display',
  android: 'sans-serif',
  default: 'sans-serif',
});

export const Typography = {
  // Hero titles — large, impactful
  hero: {
    fontFamily,
    fontSize: 40,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -1.2,
  },

  // Large titles
  h1: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 38,
    letterSpacing: -0.8,
  },

  // Section headers
  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 30,
    letterSpacing: -0.5,
  },

  // Subsection headers
  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  // Card titles
  h4: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  // Body text
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: 0,
  },

  // Body medium
  bodyMedium: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: 0,
  },

  // Body bold
  bodyBold: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: 0,
  },

  // Small text
  small: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  // Caption
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.2,
  },

  // Overline — uppercase labels
  overline: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  // Numeric display — for scores, gauges
  score: {
    fontFamily,
    fontSize: 48,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 52,
    letterSpacing: -2,
  },

  // Numeric medium
  scoreMedium: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
    letterSpacing: -1,
  },

  // Button text
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // Tab label
  tab: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.5,
  },
} as const;

export type TypographyVariant = keyof typeof Typography;
