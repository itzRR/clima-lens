// ClimaLens — TypeScript Type Definitions

export interface Destination {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  province: string;
  description: string;
  longDescription: string;
  category: 'beach' | 'hill-country' | 'cultural' | 'wildlife' | 'adventure';
  image: string;
  attractions: string[];
  activities: string[];
  emergencyContacts: EmergencyContact[];
  hospitals: string[];
  bestTimeToVisit: string;
  elevation?: number;
}

export interface EmergencyContact {
  name: string;
  number: string;
  type: 'police' | 'ambulance' | 'fire' | 'hospital' | 'disaster';
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  apparentTemperature: number;
  isDay: boolean;
}

export interface ForecastDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeedMax: number;
  weatherCode: number;
}

export interface RiskScore {
  score: number;
  level: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
  label: string;
  color: string;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  description: string;
}

export interface CommunityReport {
  id: string;
  type: 'flood' | 'landslide' | 'blocked-road' | 'power-outage' | 'heavy-rain' | 'other';
  location: string;
  district: string;
  lat: number;
  lng: number;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  timestamp: string;
  upvotes: number;
  verified: boolean;
  reporterName: string;
  photoUrl?: string;
}

export interface District {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  population: number;
  area: number;
  riskScore?: RiskScore;
  weather?: WeatherData;
}

export interface Alert {
  id: string;
  type: 'weather' | 'flood' | 'landslide' | 'tsunami' | 'general';
  severity: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  description: string;
  district: string;
  timestamp: string;
  active: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  language: 'en' | 'si' | 'ta';
  theme: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;
  savedDestinations: string[];
  reportsCount: number;
  joinDate: string;
}

export interface TravelScore {
  overall: number;
  safety: number;
  comfort: number;
  weather: number;
  confidence: number;
}

export interface RiskPrediction {
  floodRisk: number;
  landslideRisk: number;
  rainfallRisk: number;
  heatRisk: number;
  airQuality: number;
  confidence: number;
}

export interface DestinationHistory {
  culturalHistory: string;
  historicalEvents: { year: number; event: string; type: 'cultural' | 'disaster' | 'development' | 'milestone' }[];
  riskHistory: { year: number; month: string; type: string; severity: 'low' | 'moderate' | 'high' | 'critical'; description: string }[];
  safetyNotes: string[];
}
