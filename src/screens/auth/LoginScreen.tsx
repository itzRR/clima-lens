import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { supabase } from '../../services/supabaseClient';
import { GlassCard } from '../../components/common/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.emoji}>🌍</Text>
            <Text style={styles.title}>ClimaLens</Text>
            <Text style={styles.subtitle}>Welcome back, traveler.</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.loginBtn, loading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.loginText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  card: {
    padding: Spacing.xl,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  loginBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginText: {
    ...Typography.button,
    color: Colors.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  signupText: {
    ...Typography.bodyBold,
    color: Colors.accent,
  },
});
