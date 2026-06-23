// ClimaLens — Constants & Configuration

export const APP_NAME = 'ClimaLens';
export const APP_TAGLINE = 'Know Before You Go';
export const APP_DESCRIPTION = 'AI-Powered Climate Risk & Travel Intelligence';

export const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
export const SRI_LANKA_BOUNDS = {
  north: 10.0,
  south: 5.7,
  east: 82.1,
  west: 79.4,
};
export const DEFAULT_MAP_ZOOM = 7.5;

// Risk level thresholds
export const RISK_LEVELS = {
  safe: { min: 0, max: 20, label: 'Safe', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.15)', icon: '✓' },
  low: { min: 21, max: 40, label: 'Low Risk', color: '#38BDF8', bgColor: 'rgba(56, 189, 248, 0.15)', icon: '●' },
  moderate: { min: 41, max: 60, label: 'Moderate', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: '▲' },
  high: { min: 61, max: 80, label: 'High Risk', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: '◆' },
  critical: { min: 81, max: 100, label: 'Critical', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)', icon: '✕' },
} as const;

export function getRiskLevel(score: number) {
  if (score <= 20) return RISK_LEVELS.safe;
  if (score <= 40) return RISK_LEVELS.low;
  if (score <= 60) return RISK_LEVELS.moderate;
  if (score <= 80) return RISK_LEVELS.high;
  return RISK_LEVELS.critical;
}

export function getRiskLevelName(score: number): 'safe' | 'low' | 'moderate' | 'high' | 'critical' {
  if (score <= 20) return 'safe';
  if (score <= 40) return 'low';
  if (score <= 60) return 'moderate';
  if (score <= 80) return 'high';
  return 'critical';
}

// Weather code descriptions
export const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Slight snowfall', icon: '❄️' },
  73: { description: 'Moderate snowfall', icon: '❄️' },
  75: { description: 'Heavy snowfall', icon: '❄️' },
  80: { description: 'Rain showers', icon: '🌦️' },
  81: { description: 'Moderate showers', icon: '🌧️' },
  82: { description: 'Violent showers', icon: '⛈️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Heavy thunderstorm', icon: '⛈️' },
};

export const EMERGENCY_CONTACTS = [
  { name: 'Police Emergency', number: '119', type: 'police' as const },
  { name: 'Ambulance / Fire', number: '110', type: 'ambulance' as const },
  { name: 'Disaster Management Center', number: '117', type: 'disaster' as const },
  { name: 'Tourist Police', number: '+94 11 242 1052', type: 'police' as const },
  { name: 'National Hospital Colombo', number: '+94 11 269 1111', type: 'hospital' as const },
];

export const REPORT_TYPES = [
  { value: 'flood', label: 'Flood', icon: '🌊', color: '#38BDF8' },
  { value: 'landslide', label: 'Landslide', icon: '⛰️', color: '#A855F7' },
  { value: 'blocked-road', label: 'Blocked Road', icon: '🚧', color: '#F59E0B' },
  { value: 'power-outage', label: 'Power Outage', icon: '⚡', color: '#EF4444' },
  { value: 'heavy-rain', label: 'Heavy Rain', icon: '🌧️', color: '#6366F1' },
  { value: 'other', label: 'Other', icon: '📝', color: '#94A3B8' },
] as const;

export const INTEREST_CATEGORIES = [
  { id: 'beaches', label: 'Beaches', icon: '🏖️', color: '#38BDF8' },
  { id: 'surfing', label: 'Surfing', icon: '🏄', color: '#06B6D4' },
  { id: 'wildlife', label: 'Wildlife', icon: '🐘', color: '#22C55E' },
  { id: 'hiking', label: 'Hiking', icon: '🥾', color: '#84CC16' },
  { id: 'food', label: 'Food', icon: '🍛', color: '#F59E0B' },
  { id: 'culture', label: 'Culture', icon: '🏛️', color: '#A855F7' },
  { id: 'photography', label: 'Photography', icon: '📸', color: '#EC4899' },
] as const;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// Supabase config
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


