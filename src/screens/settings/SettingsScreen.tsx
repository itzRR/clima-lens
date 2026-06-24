import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, TextInput, Platform, Image, Linking, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabaseClient';
import { registerForPushNotificationsAsync } from '../../services/NotificationService';
import { AdminBotService } from '../../services/AdminBotService';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LanguageSelectorSheet } from '../../components/common/LanguageSelectorSheet';

const AVATAR_GRADIENTS: [string, string][] = [
  ['#4ADE80', '#22C55E'],
  ['#00D4FF', '#0066FF'],
  ['#FF6B6B', '#FFE66D'],
  ['#A855F7', '#EC4899'],
  ['#22C55E', '#16A34A'],
  ['#F97316', '#EF4444'],
  ['#6366F1', '#8B5CF6'],
  ['#1E3A5F', '#4A90D9'],
];

const DATA_SOURCES = [
  { name: 'Climate Hazards Center (CHIRPS)', icon: 'cloud-outline' as const },
  { name: 'Humanitarian Data Exchange (HDX)', icon: 'analytics-outline' as const },
  { name: 'Disaster Management Centre (DMC)', icon: 'shield-outline' as const },
  { name: 'UNESCO IHP-WINS', icon: 'water-outline' as const },
];

export default function SettingsScreen() {
  const { language, setLanguage, locationEnabled, setLocationEnabled, notificationsEnabled, setNotifications, pushToken, setPushToken } = useSettingsStore();
  const { session, signOut, updateProfile } = useAuthStore();
  const { t, i18n } = useTranslation();
  const [showLimitations, setShowLimitations] = useState(false);
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  const { mode, setMode, colors, isDark } = useTheme();
  
  // Profile editing state
  const [displayName, setDisplayName] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(0);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.user_metadata) {
      setDisplayName(session.user.user_metadata.display_name || '');
      setSelectedGradient(session.user.user_metadata.avatar_gradient || 0);
      setAvatarSeed(session.user.user_metadata.avatar_seed || '');
    }
  }, [session]);

  const getInitials = () => {
    if (!displayName) return session?.user?.email?.charAt(0)?.toUpperCase() || 'U';
    return displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(displayName, selectedGradient, avatarSeed);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled;
    setNotifications(newValue);

    if (!newValue && pushToken) {
      // User disabled notifications -> remove from Supabase
      await supabase.from('push_tokens').delete().eq('token', pushToken);
    } else if (newValue) {
      // User enabled notifications -> request & upsert to Supabase
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('push_tokens').upsert({
          token: token,
          user_id: session?.user?.id || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token' });
      }
    }
  };

  const handleLanguageSelect = (lang: 'en' | 'si' | 'ta') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setShowLangSheet(false);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    await AdminBotService.sendUserFeedback(session?.user?.email || 'Guest', feedbackText);
    setSendingFeedback(false);
    setShowFeedbackModal(false);
    setFeedbackText('');
    Alert.alert('Sent!', 'Your message has been sent directly to the admin.');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const generateNewAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setAvatarSeed(randomSeed);
  };

  const gradient = AVATAR_GRADIENTS[selectedGradient % AVATAR_GRADIENTS.length];

  // --- Reusable Toggle Component ---
  const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <View style={[
        styles.toggleTrack,
        { backgroundColor: value ? colors.accent : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)') }
      ]}>
        <View style={[
          styles.toggleThumb,
          { 
            backgroundColor: '#fff',
            transform: [{ translateX: value ? 20 : 2 }],
            ...Platform.select({
              web: {
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              } as any,
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.25,
                shadowRadius: 2,
                elevation: 2,
              },
            }),
          }
        ]} />
      </View>
    </TouchableOpacity>
  );

  // --- Reusable Setting Row ---
  const SettingRow = ({ 
    icon, iconColor, label, sublabel, right, onPress, isLast 
  }: { 
    icon: string; iconColor?: string; label: string; sublabel?: string; 
    right?: React.ReactNode; onPress?: () => void; isLast?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: (iconColor || colors.accent) + '15' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor || colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
        {sublabel && <Text style={[styles.settingSublabel, { color: colors.textTertiary }]}>{sublabel}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ─── Header ─── */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('profile.title', 'Settings')}</Text>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            SECTION 1: PROFILE CARD
        ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.avatarLarge}
                >
                  {avatarSeed ? (
                    <Image 
                      source={{ uri: `https://api.dicebear.com/7.x/adventurer/png?seed=${avatarSeed}&backgroundColor=transparent` }} 
                      style={{ width: '80%', height: '80%' }} 
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  )}
                </LinearGradient>
                <View style={[styles.avatarRing, { borderColor: gradient[0] + '40' }]} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.textPrimary }]}>{displayName || 'Set your name'}</Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{session?.user?.email}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.editChip, { backgroundColor: isEditing ? colors.danger + '15' : colors.accent + '15' }]}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Ionicons name={isEditing ? "close" : "create-outline"} size={16} color={isEditing ? colors.danger : colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Editable Section */}
            {isEditing && (
              <View style={[styles.editSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', color: colors.textPrimary }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                {/* Avatar Generator */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Avatar</Text>
                  <TouchableOpacity 
                    style={[styles.generateBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} 
                    onPress={generateNewAvatar}
                  >
                    <Ionicons name="shuffle-outline" size={18} color={colors.accent} />
                    <Text style={[styles.generateBtnText, { color: colors.textPrimary }]}>Randomize Character</Text>
                  </TouchableOpacity>
                </View>

                {/* Avatar Color Picker */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Background Color</Text>
                  <View style={styles.gradientPicker}>
                    {AVATAR_GRADIENTS.map((grad, index) => (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => setSelectedGradient(index)}
                        style={[styles.gradientOption, selectedGradient === index && { borderColor: colors.accent }]}
                      >
                        <LinearGradient
                          colors={grad}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={styles.gradientCircle}
                        >
                          {selectedGradient === index && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.accent, '#22C55E']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.lg }]}
                  />
                  <Ionicons name="checkmark-circle" size={18} color={colors.background} />
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            SECTION 2: PREFERENCES
        ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
            
            {/* Theme */}
            <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="color-palette-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Theme</Text>
              </View>
              <View style={styles.themeToggleContainer}>
                {([
                  { key: 'light' as const, icon: 'sunny' },
                  { key: 'system' as const, icon: 'phone-portrait-outline' },
                  { key: 'dark' as const, icon: 'moon' },
                ]).map((item) => (
                  <TouchableOpacity 
                    key={item.key}
                    style={[
                      styles.themeOption, 
                      mode === item.key && { backgroundColor: colors.accent + '20' }
                    ]} 
                    onPress={() => setMode(item.key)}
                  >
                    <Ionicons name={item.icon as any} size={16} color={mode === item.key ? colors.accent : colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Language */}
            <SettingRow
              icon="language-outline"
              iconColor="#6366F1"
              label={language === 'en' ? 'English' : language === 'si' ? 'සිංහල' : 'தமிழ்'}
              sublabel="Display language"
              onPress={() => setShowLangSheet(true)}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />

            {/* Location */}
            <SettingRow
              icon="location-outline"
              iconColor="#3B82F6"
              label="Location Access"
              sublabel={locationEnabled ? 'Current location & weather visible' : 'Location card hidden'}
              right={<Toggle value={locationEnabled} onToggle={() => setLocationEnabled(!locationEnabled)} />}
            />

            {/* Notifications */}
            <SettingRow
              icon="notifications-outline"
              iconColor="#A855F7"
              label="Push Notifications"
              sublabel={notificationsEnabled ? 'Severe weather alerts enabled' : 'Alerts disabled'}
              right={<Toggle value={notificationsEnabled} onToggle={handleNotificationToggle} />}
              isLast
            />
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            SECTION 3: ABOUT
        ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('profile.about', 'ABOUT')}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
            
            {/* App Identity */}
            <View style={styles.aboutHeader}>
              <LinearGradient
                colors={['#0F3D2E', '#1B5E20']}
                style={styles.appIconContainer}
              >
                <Ionicons name="globe-outline" size={26} color={Colors.accent} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: colors.textPrimary }]}>ClimaLens</Text>
                <Text style={[styles.appTagline, { color: colors.textSecondary }]}>Climate Risk & Travel Intelligence</Text>
              </View>
              <View style={[styles.versionBadge, { borderColor: colors.accent + '30', backgroundColor: colors.accent + '12' }]}>
                <Text style={[styles.versionText, { color: colors.accent }]}>v1.5</Text>
              </View>
            </View>
            
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              A student-built prototype for the CIS047-3 Agile Project Management module at the University of Bedfordshire (2025–26). Created by a team of five students for educational demonstration.
            </Text>
            
            {/* Meta Info Grid */}
            <View style={styles.metaGrid}>
              {[
                { icon: 'people-outline', label: 'Team', value: 'Rehan, Thimira, Oshadi, Frank, Madara', color: '#6366F1' },
                { icon: 'map-outline', label: 'Coverage', value: 'Sri Lanka • 25 districts', color: '#3B82F6' },
                { icon: 'calendar-outline', label: 'Data Range', value: '1981 – 2025', color: '#F59E0B' },
                { icon: 'checkmark-circle-outline', label: 'Validated', value: 'Cyclone Ditwah (Nov \'25)', color: Colors.accent },
              ].map((item, idx) => (
                <View key={idx} style={[styles.metaRow, { borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                  <View style={[styles.metaIconWrap, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name={item.icon as any} size={14} color={item.color} />
                  </View>
                  <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                  <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Limitations */}
            <TouchableOpacity 
              style={[styles.accordionHeader, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} 
              onPress={() => setShowLimitations(!showLimitations)}
              activeOpacity={0.6}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>Limitations</Text>
              </View>
              <Ionicons name={showLimitations ? "chevron-up" : "chevron-down"} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            
            {showLimitations && (
              <View style={styles.accordionContent}>
                {[
                  'This is a UI/UX prototype — weather data and disaster events are simulated.',
                  'The Avatar API is a free community service and may occasionally fail.',
                  'Animations may be heavy on older devices; production would need WebGL optimisation.',
                ].map((text, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: Colors.warning + '60' }]} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            SECTION 4: DATA SOURCES & LINKS
        ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DATA SOURCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
            {DATA_SOURCES.map((source, index) => (
              <SettingRow
                key={index}
                icon={source.icon}
                iconColor={colors.textSecondary}
                label={source.name}
                isLast={index === DATA_SOURCES.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════
            SECTION 5: LINKS
        ═══════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>LINKS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]}>
            <SettingRow
              icon="globe-outline"
              iconColor={colors.accent}
              label="Official Website"
              sublabel="safe-travel-lanka.vercel.app"
              onPress={() => Linking.openURL('https://safe-travel-lanka.vercel.app/')}
              right={<Ionicons name="open-outline" size={16} color={colors.textTertiary} />}
            />
            <SettingRow
              icon="chatbubbles-outline"
              iconColor="#10B981"
              label="Contact Admin"
              sublabel="Send feedback or report a bug"
              onPress={() => setShowFeedbackModal(true)}
              right={<Ionicons name="paper-plane-outline" size={16} color={colors.textTertiary} />}
              isLast
            />
          </View>
        </Animated.View>

        {/* ─── Disclaimer ─── */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <View style={[styles.disclaimer, { backgroundColor: Colors.warning + '08', borderColor: Colors.warning + '20' }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.warning} />
            <Text style={[styles.disclaimerText, { color: isDark ? Colors.warning : '#92400E' }]}>
              {t('profile.disclaimer', 'For academic and demonstration purposes only. Do not rely on this for life-safety or official weather advisories.')}
            </Text>
          </View>
        </Animated.View>

        {/* ─── Logout ─── */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: Colors.danger + '08', borderColor: Colors.danger + '20' }]} 
            onPress={() => setShowLogoutModal(true)} 
            activeOpacity={0.6}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB' }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Contact Admin</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Found a bug? Have a suggestion? Send a direct message to the admin.
            </Text>
            <TextInput
              style={[styles.feedbackInput, { color: colors.textPrimary, borderColor: isDark ? '#333' : '#E5E7EB', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }]}
              placeholder="Type your message here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFeedbackModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSubmit, { backgroundColor: colors.primary, opacity: !feedbackText.trim() || sendingFeedback ? 0.5 : 1 }]} 
                onPress={handleSendFeedback}
                disabled={!feedbackText.trim() || sendingFeedback}
              >
                {sendingFeedback ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSubmitText}>Send Message</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ─── Section ───
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // ─── Card ───
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ─── Setting Row ───
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 1,
  },
  settingLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  settingSublabel: {
    ...Typography.caption,
    fontSize: 11,
  },

  // ─── Theme Toggle ───
  themeToggleContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 2,
  },
  themeOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },

  // ─── Toggle Switch ───
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // ─── Profile ───
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 32,
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...Typography.h3,
    fontSize: 17,
  },
  profileEmail: {
    ...Typography.caption,
    fontSize: 12,
  },
  editChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Edit Section ───
  editSection: {
    padding: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...Typography.body,
    fontSize: 14,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  generateBtnText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  gradientPicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  gradientOption: {
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradientCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  saveButtonText: {
    ...Typography.button,
    fontSize: 14,
  },

  // ─── About ───
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  appTagline: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aboutText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },

  // ─── Meta Grid ───
  metaGrid: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  metaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaLabel: {
    ...Typography.caption,
    fontSize: 11,
    width: 65,
    fontWeight: '600',
  },
  metaValue: {
    ...Typography.body,
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },

  // ─── Accordion ───
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  accordionTitle: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  accordionContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },

  // ─── Disclaimer ───
  disclaimer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  // ─── Logout ───
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    height: 120,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  modalCancel: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
  },
  modalSubmit: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
