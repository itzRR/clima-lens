import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { supabase } from '../../services/supabaseClient';
import { GlassCard } from '../../components/common/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    
    setLoading(true);
    
    // Auto-generate avatar seed and a random gradient
    const randomSeed = Math.random().toString(36).substring(2, 8);
    const randomGradient = Math.floor(Math.random() * 8);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          full_name: name,
          avatar_seed: randomSeed,
          avatar_gradient: randomGradient
        }
      }
    });
    
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      if (data.session) {
        // Will auto redirect via AppNavigator
      } else {
        Alert.alert('Check your email', 'We sent you a confirmation link.');
        navigation.navigate('Login');
      }
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join ClimaLens for safer travel.</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

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
              placeholder="Create a strong password"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.loginBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.loginText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signupText}>Log In</Text>
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
  backButton: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    marginTop: Spacing['2xl'],
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
