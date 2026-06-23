import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', icon: 'language-outline' as const },
  { code: 'si', label: 'Sinhala', native: 'සිංහල', icon: 'language-outline' as const },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', icon: 'language-outline' as const },
] as const;

export function LanguageSelectorSheet({ visible, onClose }: Props) {
  const { language, setLanguage } = useSettingsStore();
  const { i18n } = useTranslation();

  const handleSelect = (code: 'en' | 'si' | 'ta') => {
    setLanguage(code);
    i18n.changeLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View 
          entering={SlideInDown.duration(300)} 
          exiting={SlideOutDown.duration(200)}
          style={styles.sheet}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.handle} />
            <Text style={styles.title}>Select Language</Text>
            
            <View style={styles.list}>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.row, isActive && styles.rowActive]}
                    onPress={() => handleSelect(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowContent}>
                      <Ionicons name={lang.icon} size={20} color={isActive ? Colors.background : Colors.textSecondary} />
                      <Text style={[styles.nativeText, isActive && styles.textActive]}>
                        {lang.native}
                      </Text>
                      {lang.code !== 'en' && (
                        <Text style={styles.label}>({lang.label})</Text>
                      )}
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color={Colors.background} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.glassBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  rowActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flag: {
    fontSize: 20,
  },
  nativeText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  label: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  textActive: {
    color: Colors.background,
  },
  cancelBtn: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
