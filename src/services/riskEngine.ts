// ClimaLens — Risk Engine (Ported from SafeTravel Lanka + enhanced)
import { RiskScore, RiskFactor, WeatherData, CommunityReport, RiskPrediction } from '../types';
import { getRiskLevel } from '../data/constants';

interface FloodHistory {
  district: string;
  floodFrequency: number; // 0-10 scale
  lastFloodYear: number;
}

// Historical flood risk data for Sri Lankan districts
const FLOOD_HISTORY: Record<string, FloodHistory> = {
  Colombo: { district: 'Colombo', floodFrequency: 8, lastFloodYear: 2024 },
  Gampaha: { district: 'Gampaha', floodFrequency: 7, lastFloodYear: 2024 },
  Kalutara: { district: 'Kalutara', floodFrequency: 7, lastFloodYear: 2023 },
  Kandy: { district: 'Kandy', floodFrequency: 5, lastFloodYear: 2023 },
  Matale: { district: 'Matale', floodFrequency: 4, lastFloodYear: 2022 },
  'Nuwara Eliya': { district: 'Nuwara Eliya', floodFrequency: 3, lastFloodYear: 2021 },
  Galle: { district: 'Galle', floodFrequency: 6, lastFloodYear: 2023 },
  Matara: { district: 'Matara', floodFrequency: 5, lastFloodYear: 2023 },
  Hambantota: { district: 'Hambantota', floodFrequency: 3, lastFloodYear: 2022 },
  Jaffna: { district: 'Jaffna', floodFrequency: 4, lastFloodYear: 2023 },
  Kilinochchi: { district: 'Kilinochchi', floodFrequency: 5, lastFloodYear: 2022 },
  Mannar: { district: 'Mannar', floodFrequency: 4, lastFloodYear: 2021 },
  Mullaitivu: { district: 'Mullaitivu', floodFrequency: 5, lastFloodYear: 2022 },
  Vavuniya: { district: 'Vavuniya', floodFrequency: 3, lastFloodYear: 2021 },
  Trincomalee: { district: 'Trincomalee', floodFrequency: 6, lastFloodYear: 2023 },
  Batticaloa: { district: 'Batticaloa', floodFrequency: 7, lastFloodYear: 2024 },
  Ampara: { district: 'Ampara', floodFrequency: 5, lastFloodYear: 2023 },
  Kurunegala: { district: 'Kurunegala', floodFrequency: 5, lastFloodYear: 2023 },
  Puttalam: { district: 'Puttalam', floodFrequency: 4, lastFloodYear: 2022 },
  Anuradhapura: { district: 'Anuradhapura', floodFrequency: 4, lastFloodYear: 2022 },
  Polonnaruwa: { district: 'Polonnaruwa', floodFrequency: 5, lastFloodYear: 2023 },
  Badulla: { district: 'Badulla', floodFrequency: 6, lastFloodYear: 2024 },
  Monaragala: { district: 'Monaragala', floodFrequency: 4, lastFloodYear: 2022 },
  Ratnapura: { district: 'Ratnapura', floodFrequency: 9, lastFloodYear: 2024 },
  Kegalle: { district: 'Kegalle', floodFrequency: 8, lastFloodYear: 2024 },
};

// Landslide-prone districts (0-10 scale)
const LANDSLIDE_RISK: Record<string, number> = {
  Ratnapura: 9,
  Kegalle: 8,
  Badulla: 7,
  'Nuwara Eliya': 7,
  Kandy: 6,
  Matale: 5,
  Kalutara: 4,
  Galle: 3,
  Matara: 3,
  Colombo: 2,
};

// Heat risk by elevation zone
const HEAT_RISK: Record<string, number> = {
  Colombo: 7, Gampaha: 7, Kalutara: 6, Galle: 6, Matara: 6,
  Hambantota: 8, Jaffna: 8, Kilinochchi: 7, Mannar: 8,
  Vavuniya: 7, Trincomalee: 8, Batticaloa: 7, Ampara: 7,
  Kurunegala: 6, Puttalam: 8, Anuradhapura: 8, Polonnaruwa: 7,
  Kandy: 4, Matale: 5, 'Nuwara Eliya': 1, Badulla: 3,
  Monaragala: 6, Ratnapura: 5, Kegalle: 5, Mullaitivu: 7,
};

const WEIGHTS = {
  rainfall: 0.25,
  wind: 0.10,
  flood: 0.25,
  landslide: 0.15,
  heat: 0.10,
  reports: 0.15,
};

export function calculateRiskScore(
  weather: WeatherData | null,
  district: string,
  recentReports: CommunityReport[] = []
): RiskScore {
  const factors: RiskFactor[] = [];

  // 1. Rainfall risk factor
  const rainScore = weather ? Math.min(100, (weather.precipitation / 50) * 100) : 20;
  factors.push({
    name: 'Rainfall',
    value: weather?.precipitation ?? 0,
    weight: WEIGHTS.rainfall,
    contribution: rainScore * WEIGHTS.rainfall,
    description: `Current precipitation: ${weather?.precipitation ?? 0}mm`,
  });

  // 2. Wind risk factor
  const windScore = weather ? Math.min(100, (weather.windSpeed / 80) * 100) : 10;
  factors.push({
    name: 'Wind Speed',
    value: weather?.windSpeed ?? 0,
    weight: WEIGHTS.wind,
    contribution: windScore * WEIGHTS.wind,
    description: `Wind speed: ${weather?.windSpeed ?? 0} km/h`,
  });

  // 3. Flood history factor
  const floodData = FLOOD_HISTORY[district];
  const floodScore = floodData ? (floodData.floodFrequency / 10) * 100 : 20;
  factors.push({
    name: 'Flood History',
    value: floodData?.floodFrequency ?? 0,
    weight: WEIGHTS.flood,
    contribution: floodScore * WEIGHTS.flood,
    description: `Historical flood frequency: ${floodData?.floodFrequency ?? 0}/10`,
  });

  // 4. Landslide risk factor
  const landslideRisk = LANDSLIDE_RISK[district] ?? 1;
  const landslideScore = (landslideRisk / 10) * 100;
  factors.push({
    name: 'Landslide Risk',
    value: landslideRisk,
    weight: WEIGHTS.landslide,
    contribution: landslideScore * WEIGHTS.landslide,
    description: `Landslide susceptibility: ${landslideRisk}/10`,
  });

  // 5. Heat risk
  const heatRisk = HEAT_RISK[district] ?? 5;
  const heatScore = (heatRisk / 10) * 100;
  factors.push({
    name: 'Heat Risk',
    value: heatRisk,
    weight: WEIGHTS.heat,
    contribution: heatScore * WEIGHTS.heat,
    description: `Heat susceptibility: ${heatRisk}/10`,
  });

  // 6. Community reports factor
  const recentCount = recentReports.filter((r) => {
    const reportAge = Date.now() - new Date(r.timestamp).getTime();
    return reportAge < 24 * 60 * 60 * 1000;
  }).length;
  const reportScore = Math.min(100, recentCount * 20);
  factors.push({
    name: 'Community Reports',
    value: recentCount,
    weight: WEIGHTS.reports,
    contribution: reportScore * WEIGHTS.reports,
    description: `${recentCount} reports in the last 24 hours`,
  });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));
  const clampedScore = Math.max(0, Math.min(100, totalScore));
  const level = getRiskLevel(clampedScore);

  return {
    score: clampedScore,
    level: clampedScore <= 20 ? 'safe' : clampedScore <= 40 ? 'low' : clampedScore <= 60 ? 'moderate' : clampedScore <= 80 ? 'high' : 'critical',
    label: level.label,
    color: level.color,
    factors,
  };
}

// Generate individual risk predictions (for the 5 gauges)
export function calculateRiskPrediction(
  weather: WeatherData | null,
  district: string,
): RiskPrediction {
  const floodData = FLOOD_HISTORY[district];
  const landslide = LANDSLIDE_RISK[district] ?? 1;
  const heat = HEAT_RISK[district] ?? 5;

  // Flood risk: combination of historical and current conditions
  const floodBase = floodData ? (floodData.floodFrequency / 10) * 60 : 15;
  const floodWeather = weather ? Math.min(40, (weather.precipitation / 30) * 40) : 5;
  const floodRisk = Math.min(100, Math.round(floodBase + floodWeather));

  // Landslide risk
  const landslideBase = (landslide / 10) * 70;
  const landslideWeather = weather ? Math.min(30, (weather.precipitation / 40) * 30) : 5;
  const landslideRisk = Math.min(100, Math.round(landslideBase + landslideWeather));

  // Rainfall risk: purely weather-based
  const rainfallRisk = weather
    ? Math.min(100, Math.round((weather.precipitation / 25) * 50 + (weather.humidity / 100) * 30))
    : 20;

  // Heat risk
  const heatBase = (heat / 10) * 50;
  const heatWeather = weather ? Math.min(50, Math.max(0, (weather.temperature - 28) * 10)) : 15;
  const heatRisk = Math.min(100, Math.round(heatBase + heatWeather));

  // Air quality (simulated - in production would use real AQI API)
  const aqBase = weather ? (weather.humidity > 80 ? 40 : 20) : 25;
  const airQuality = Math.min(100, Math.round(aqBase + Math.random() * 15));

  // Confidence based on data availability
  const confidence = weather ? 0.85 : 0.55;

  return {
    floodRisk,
    landslideRisk,
    rainfallRisk,
    heatRisk,
    airQuality,
    confidence,
  };
}

// Generate a demo risk score for a district
export function generateDemoRiskScore(district: string): RiskScore {
  const floodData = FLOOD_HISTORY[district];
  const landslideRisk = LANDSLIDE_RISK[district] ?? 1;

  const baseScore = ((floodData?.floodFrequency ?? 3) * 5 + landslideRisk * 3);
  const variation = (district.charCodeAt(0) % 10) * 2;
  const score = Math.max(5, Math.min(85, baseScore + variation));

  const level = getRiskLevel(score);

  return {
    score,
    level: score <= 20 ? 'safe' : score <= 40 ? 'low' : score <= 60 ? 'moderate' : score <= 80 ? 'high' : 'critical',
    label: level.label,
    color: level.color,
    factors: [],
  };
}

// Calculate travel suitability score (inverse of risk, weather-adjusted)
export function calculateTravelScore(riskScore: number, comfortScore: number): number {
  const safetyWeight = 0.6;
  const comfortWeight = 0.4;
  const safetyComponent = (100 - riskScore) * safetyWeight;
  const comfortComponent = comfortScore * comfortWeight;
  return Math.round(safetyComponent + comfortComponent);
}
