// ClimaLens — Premium GlassCard Component
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors } from '../../theme';
import { BorderRadius, Spacing } from '../../theme/spacing';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
  noPadding?: boolean;
  variant?: 'default' | 'elevated' | 'accent' | 'glow';
  glowColor?: string;
}

export function GlassCard({ children, style, intensity = 20, noPadding = false, variant = 'default', glowColor }: GlassCardProps) {
  const borderColor = variant === 'accent' 
    ? 'rgba(74, 222, 128, 0.25)'
    : variant === 'elevated' 
      ? 'rgba(255,255,255,0.1)' 
      : variant === 'glow'
        ? (glowColor || Colors.accent) + '40'
        : Colors.glassBorder;

  const bgColor = variant === 'accent'
    ? 'rgba(15, 61, 46, 0.5)'
    : variant === 'elevated'
      ? 'rgba(26, 33, 29, 0.9)'
      : variant === 'glow'
        ? 'rgba(20, 28, 24, 0.85)'
        : 'rgba(18, 22, 20, 0.8)';

  const shadowStyle = (variant === 'glow' || variant === 'accent') ? {
    ...Platform.select({
      web: {
        boxShadow: `0 0 20px ${(glowColor || Colors.accent)}15, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
      } as any,
      default: {
        shadowColor: glowColor || Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  } : {
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor, backgroundColor: bgColor },
        shadowStyle,
        !noPadding && styles.padding,
        style,
      ]}
    >
      {/* Inner highlight line */}
      <View style={styles.innerHighlight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  padding: {
    padding: Spacing.lg,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1,
  },
});
