// ClimaLens Theme Context — Dark/Light/System mode support
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, LightColors, ColorScheme } from './colors';
import { useSettingsStore } from '../store/settingsStore';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ColorScheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  setMode: () => {},
  colors: Colors,
  isDark: true,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const storedTheme = useSettingsStore(state => state.theme);
  const setStoredTheme = useSettingsStore(state => state.setTheme);
  const [mode, setModeState] = useState<ThemeMode>(storedTheme || 'dark');

  // Sync from store on mount / when store changes
  useEffect(() => {
    if (storedTheme && storedTheme !== mode) {
      setModeState(storedTheme);
    }
  }, [storedTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    setStoredTheme(newMode);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme !== 'light');
  const colors = isDark ? Colors : LightColors;

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };
