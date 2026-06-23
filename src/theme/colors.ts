// ClimaLens Design Tokens — Color System
export const Colors = {
  // Core palette
  primary: '#0F3D2E',
  secondary: '#1B5E20',
  accent: '#4ADE80',
  accentMuted: '#2DD4BF',

  // Backgrounds
  background: '#090B0A',
  card: '#121614',
  surface: '#1A211D',
  surfaceElevated: '#232B27',
  surfaceHover: '#2A3430',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#6B7280',
  textInverse: '#090B0A',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Glass effects
  glass: 'rgba(18, 22, 20, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassLight: 'rgba(255, 255, 255, 0.05)',

  // Accent glow
  accentGlow: 'rgba(74, 222, 128, 0.15)',
  accentGlowStrong: 'rgba(74, 222, 128, 0.3)',

  // Risk colors
  riskSafe: '#22C55E',
  riskLow: '#38BDF8',
  riskModerate: '#F59E0B',
  riskHigh: '#EF4444',
  riskCritical: '#DC2626',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#0F3D2E', '#1B5E20'] as const,
  gradientAccent: ['#4ADE80', '#2DD4BF'] as const,
  gradientDark: ['#090B0A', '#121614'] as const,
  gradientCard: ['rgba(18, 22, 20, 0.9)', 'rgba(26, 33, 29, 0.7)'] as const,
  gradientHero: ['#090B0A', '#0F3D2E', '#090B0A'] as const,

  // Tab bar
  tabBarBg: 'rgba(9, 11, 10, 0.92)',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabBarActive: '#4ADE80',
  tabBarInactive: '#6B7280',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayDark: 'rgba(0, 0, 0, 0.85)',
} as const;

// Light mode overrides (future)
export const LightColors = {
  ...Colors,
  background: '#F8FAF9',
  card: '#FFFFFF',
  surface: '#F0F4F2',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#0F1A15',
  textSecondary: '#52525B',
  textTertiary: '#A1A1AA',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  tabBarBg: 'rgba(248, 250, 249, 0.92)',
  tabBarBorder: 'rgba(0, 0, 0, 0.06)',
} as const;

export type ColorScheme = {
  [K in keyof typeof Colors]: typeof Colors[K] extends readonly string[] ? readonly string[] : string;
};
