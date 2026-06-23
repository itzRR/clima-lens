// ClimaLens Animation Presets — React Native Reanimated
import { Easing } from 'react-native-reanimated';

export const AnimationConfig = {
  // Spring configs
  spring: {
    gentle: { damping: 20, stiffness: 120, mass: 1 },
    snappy: { damping: 15, stiffness: 200, mass: 0.8 },
    bouncy: { damping: 10, stiffness: 150, mass: 1 },
    smooth: { damping: 25, stiffness: 100, mass: 1.2 },
  },

  // Timing configs
  timing: {
    fast: { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    normal: { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    slow: { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    easeOut: { duration: 300, easing: Easing.out(Easing.cubic) },
    easeInOut: { duration: 400, easing: Easing.inOut(Easing.cubic) },
  },

  // Stagger delays for list animations
  stagger: {
    fast: 50,
    normal: 80,
    slow: 120,
  },

  // Scale values
  scale: {
    pressed: 0.96,
    hover: 1.02,
    active: 1.05,
  },
} as const;

// Entering/Exiting animation configs for Reanimated Layout
export const LayoutAnimation = {
  fadeInDuration: 400,
  fadeOutDuration: 250,
  slideDistance: 24,
} as const;
