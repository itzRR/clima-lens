// ClimaLens — Profile Screen
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

import { GlassCard } from '../../components/common/GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { useSettingsStore } from '../../store/settingsStore';

const LANGUAGES = [
  { code: 'en' as const, label: 'English', native: 'English' },
  { code: 'si' as const, label: 'Sinhala', native: 'සිංහල' },
  { code: 'ta' as const, label: 'Tamil', native: 'தமிழ்' },
];

function StatCard({ icon, value, label, delay }: {
  icon: string; value: string; label: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={styles.statCard}>
      <GlassCard style={styles.statInner}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

function SettingRow({ icon, iconColor, label, children, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor?: string; label: string;
  children?: React.ReactNode; onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={styles.settingRow} activeOpacity={0.7}>
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || Colors.accent) + '20' }]}>
        <Ionicons name={icon} size={18} color={iconColor || Colors.accent} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {children}
      </View>
    </Wrapper>
  );
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { mode, setMode, isDark } = useTheme();
  const { language, setLanguage, notificationsEnabled, setNotifications, userName } = useSettingsStore();

  const handleLanguageChange = (lang: 'en' | 'si' | 'ta') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.profileHeader}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userSub}>Climate Explorer</Text>
          </LinearGradient>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="📊" value="7" label={t('profile.reports')} delay={200} />
          <StatCard icon="📍" value="3" label={t('profile.saved')} delay={300} />
          <StatCard icon="📅" value="14" label={t('profile.daysActive')} delay={400} />
        </View>

        {/* Language Settings */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          <GlassCard noPadding>
            {LANGUAGES.map((lang, i) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={[
                  styles.langRow,
                  i > 0 && styles.langBorder,
                  language === lang.code && styles.langRowActive,
                ]}
              >
                <View>
                  <Text style={styles.langLabel}>{lang.label}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Theme Settings */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text style={styles.sectionTitle}>{t('profile.theme')}</Text>
          <GlassCard noPadding>
            {[
              { key: 'dark' as const, label: t('profile.darkMode'), icon: '🌙' },
              { key: 'light' as const, label: t('profile.lightMode'), icon: '☀️' },
              { key: 'system' as const, label: t('profile.systemMode'), icon: '⚙️' },
            ].map((theme, i) => (
              <TouchableOpacity
                key={theme.key}
                onPress={() => setMode(theme.key)}
                style={[
                  styles.langRow,
                  i > 0 && styles.langBorder,
                  mode === theme.key && styles.langRowActive,
                ]}
              >
                <View style={styles.themeRow}>
                  <Text style={styles.themeIcon}>{theme.icon}</Text>
                  <Text style={styles.langLabel}>{theme.label}</Text>
                </View>
                {mode === theme.key && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard noPadding style={styles.settingsCard}>
            <SettingRow icon="notifications-outline" label={t('profile.notifications')}>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.surface, true: Colors.accent + '60' }}
                thumbColor={notificationsEnabled ? Colors.accent : Colors.textSecondary}
              />
            </SettingRow>
            <View style={styles.settingDivider} />
            <SettingRow icon="shield-checkmark-outline" label="Privacy" iconColor="#6366F1">
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </SettingRow>
            <View style={styles.settingDivider} />
            <SettingRow icon="help-circle-outline" label="Help & Support" iconColor="#F59E0B">
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </SettingRow>
            <View style={styles.settingDivider} />
            <SettingRow icon="information-circle-outline" label={t('profile.about')} iconColor="#3B82F6">
              <Text style={styles.versionText}>v1.3.0</Text>
            </SettingRow>
          </GlassCard>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(800).duration(500)}>
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.base, gap: Spacing.lg },
  profileHeader: {
    borderRadius: BorderRadius['2xl'], padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { ...Typography.h1, color: Colors.textPrimary },
  userName: { ...Typography.h2, color: Colors.textPrimary },
  userSub: { ...Typography.small, color: 'rgba(255,255,255,0.6)' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1 },
  statInner: { alignItems: 'center', paddingVertical: Spacing.base },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { ...Typography.h3, color: Colors.textPrimary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  sectionTitle: { ...Typography.overline, color: Colors.textSecondary, marginBottom: Spacing.sm },
  langRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
  },
  langBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  langRowActive: { backgroundColor: Colors.accentGlow },
  langLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  langNative: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  themeIcon: { fontSize: 18 },
  settingsCard: { overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    minHeight: 52,
  },
  settingIcon: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  settingLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  settingRight: { alignItems: 'flex-end' },
  settingDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: Spacing.base },
  versionText: { ...Typography.small, color: Colors.textTertiary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.base, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.danger + '10', borderWidth: 1, borderColor: Colors.danger + '20',
  },
  logoutText: { ...Typography.button, color: Colors.danger },
});
