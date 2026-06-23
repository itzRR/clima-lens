// ClimaLens — Weather Service (Open-Meteo API)
import { WeatherData, ForecastDay } from '../types';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    timezone: 'Asia/Colombo',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch weather data');

  const data = await res.json();
  const c = data.current;

  return {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    apparentTemperature: c.apparent_temperature,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    isDay: c.is_day === 1,
  };
}

export async function fetchForecast(lat: number, lng: number, days: number = 7): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'Asia/Colombo',
    forecast_days: days.toString(),
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch forecast data');

  const data = await res.json();
  const d = data.daily;

  return d.time.map((date: string, i: number) => ({
    date,
    temperatureMax: d.temperature_2m_max[i],
    temperatureMin: d.temperature_2m_min[i],
    precipitationSum: d.precipitation_sum[i],
    precipitationProbability: d.precipitation_probability_max[i],
    windSpeedMax: d.wind_speed_10m_max[i],
    weatherCode: d.weather_code[i],
  }));
}

// Generate a comfort score from weather data (0-100)
export function calculateComfortScore(weather: WeatherData): number {
  let score = 100;

  // Temperature comfort (ideal: 22-28°C)
  const temp = weather.temperature;
  if (temp < 18) score -= (18 - temp) * 4;
  else if (temp > 32) score -= (temp - 32) * 5;
  else if (temp > 28) score -= (temp - 28) * 2;

  // Humidity penalty (ideal: 40-70%)
  if (weather.humidity > 80) score -= (weather.humidity - 80) * 1.5;
  else if (weather.humidity < 30) score -= (30 - weather.humidity) * 1;

  // Rain penalty
  if (weather.precipitation > 0) score -= Math.min(30, weather.precipitation * 3);

  // Wind penalty (above 30 km/h)
  if (weather.windSpeed > 30) score -= (weather.windSpeed - 30) * 1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Get weather description from code
export function getWeatherDescription(code: number): { description: string; icon: string } {
  const mapping: Record<number, { description: string; icon: string }> = {
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
    80: { description: 'Rain showers', icon: '🌦️' },
    81: { description: 'Moderate showers', icon: '🌧️' },
    82: { description: 'Violent showers', icon: '⛈️' },
    95: { description: 'Thunderstorm', icon: '⛈️' },
    96: { description: 'Thunderstorm with hail', icon: '⛈️' },
    99: { description: 'Heavy thunderstorm', icon: '⛈️' },
  };
  return mapping[code] || { description: 'Unknown', icon: '🌡️' };
}
