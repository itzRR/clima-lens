import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeIn, 
  SlideInDown, 
  withRepeat, 
  withTiming, 
  useSharedValue, 
  useAnimatedStyle,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shimmer = useSharedValue(-width);

  useEffect(() => {
    // Hide the native splash screen now that our custom one is rendering
    ExpoSplashScreen.hideAsync().catch(() => {});

    // Pulse animation for the rings and glow
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Gentle swaying rotation for the leaf
    rotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Continuous shimmer effect
    shimmer.value = withRepeat(
      withTiming(width, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: (2 - pulse.value) * 0.6,
  }));

  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0c1411', '#0F3D2E', '#0c1411']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Background ambient glow */}
      <Animated.View style={[styles.ambientGlow, pulseStyle]} />

      <View style={styles.content}>
        <Animated.View 
          entering={Platform.OS === 'web' ? undefined : FadeIn.duration(1200).delay(200)} 
          style={styles.iconContainer}
        >
          {/* Sri Lankan Nature Motif with rotation */}
          <Animated.View style={leafStyle}>
            <Ionicons name="leaf" size={64} color={Colors.accent} />
          </Animated.View>
          {/* Inner pulse ring */}
          <Animated.View style={[styles.pulseRing, pulseStyle]} />
        </Animated.View>

        <Animated.View entering={Platform.OS === 'web' ? undefined : SlideInDown.duration(1000).springify().damping(14).delay(600)} style={styles.textContainer}>
          <Text style={styles.title}>ClimaLens</Text>
          <Text style={styles.subtitle}>Sri Lanka Risk Intelligence</Text>
        </Animated.View>

        {/* Shimmer line */}
        <Animated.View 
          entering={Platform.OS === 'web' ? undefined : FadeIn.duration(1200).delay(1200)}
          style={styles.shimmerContainer}
        >
          <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', Colors.accent, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerLine}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1411',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(74, 222, 128, 0.04)',
    top: height / 2 - (width * 0.75),
    left: width / 2 - (width * 0.75),
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: Colors.accent,
    opacity: 0.3,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
    ...Platform.select({
      web: {
        textShadow: '0px 4px 10px rgba(0,0,0,0.5)'
      } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
      }
    })
  },
  subtitle: {
    ...Typography.body,
    color: Colors.accent,
    marginTop: Spacing.sm,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: 12,
  },
  shimmerContainer: {
    marginTop: Spacing.xl * 3,
    width: 150,
    height: 1,
    overflow: 'hidden',
    opacity: 0.5,
  },
  shimmerLine: {
    width: '100%',
    height: '100%',
  },
});
