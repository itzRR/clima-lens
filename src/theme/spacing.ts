// ClimaLens Spacing System — 4px base grid
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 96,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 999,
} as const;

export const IconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
  '2xl': 48,
} as const;

export const HitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;

// Minimum touch target (WCAG)
export const MIN_TOUCH_TARGET = 44;
