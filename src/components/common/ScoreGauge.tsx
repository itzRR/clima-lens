// ClimaLens — Animated Score Gauge Component
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreGaugeProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel?: string;
  delay?: number;
  showPercentage?: boolean;
}

export function ScoreGauge({
  score,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  sublabel,
  delay = 0,
  showPercentage = true,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(score / 100, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [score, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.gaugeContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center content */}
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <Text style={[styles.score, { color }]}>
            {score}
            {showPercentage && <Text style={styles.percent}>%</Text>}
          </Text>
        </View>
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {sublabel && <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  gaugeContainer: {
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  score: {
    ...Typography.scoreMedium,
  },
  percent: {
    ...Typography.caption,
    fontSize: 14,
  },
  label: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sublabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
