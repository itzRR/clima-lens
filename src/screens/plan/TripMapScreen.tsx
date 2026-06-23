import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClimaMap } from '../../components/map/ClimaMap';
import { useDestinationsStore } from '../../store/useDestinationsStore';

import { useTranslation } from 'react-i18next';

export default function TripMapScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { destinations } = useDestinationsStore();

  const handlePinPress = (id: string, name: string) => {
    setSelectedPinId(id);
    navigation.navigate('DestinationDetail', { id, name });
  };

  const handleSearchOnline = async () => {
    const dest = await useDestinationsStore.getState().searchOnline(searchQuery);
    if (dest) {
      setSearchQuery('');
      handlePinPress(dest.id, dest.name);
    }
  };

  const filteredDestinations = destinations.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Interactive Map Layer */}
      <View style={[styles.mapContainer, { paddingTop: 0 }]}>
        <ClimaMap 
          destinations={destinations} 
          onDestinationSelect={(id, name) => handlePinPress(id, name)} 
        />
      </View>

      {/* Floating Header */}
      <View style={[styles.header, { top: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={{marginRight: 8}} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search locations..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              <FlatList
                data={filteredDestinations.slice(0, 5)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearchQuery('');
                      handlePinPress(item.id, item.name);
                    }}
                  >
                    <Ionicons name="location-outline" size={16} color={item.risk_color || colors.accent} />
                    <Text style={styles.searchResultText}>{item.name}</Text>
                    <Text style={[styles.searchResultRisk, { color: item.risk_color }]}>{item.suitability_score}/100</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <TouchableOpacity 
                    style={styles.searchResultItem}
                    onPress={handleSearchOnline}
                  >
                    <Ionicons name="globe-outline" size={16} color={colors.accent} />
                    <Text style={[styles.searchResultText, { color: colors.accent }]}>
                      Search online for "{searchQuery}"
                    </Text>
                  </TouchableOpacity>
                }
              />
              {filteredDestinations.length > 0 && (
                <TouchableOpacity 
                  style={[styles.searchResultItem, { borderTopWidth: 1, borderTopColor: colors.glassBorder, justifyContent: 'center' }]}
                  onPress={handleSearchOnline}
                >
                  <Ionicons name="search" size={14} color={colors.textSecondary} />
                  <Text style={[styles.searchResultText, { color: colors.textSecondary, fontSize: 12 }]}>
                    Search anywhere else...
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  header: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchContainer: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchBar: {
    height: 48,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  searchResultText: {
    ...Typography.body,
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  searchResultRisk: {
    ...Typography.caption,
    fontWeight: '700',
  },
  searchResultEmpty: {
    ...Typography.body,
    color: colors.textSecondary,
    padding: Spacing.md,
    textAlign: 'center',
  },
});
