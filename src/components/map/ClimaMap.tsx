import React from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { injectLeafletStyles } from './LeafletStyles';

// Web-only: react-leaflet
let MapContainer: any, TileLayer: any, CircleMarker: any, Popup: any, useMapEvents: any;
if (Platform.OS === 'web') {
  try {
    const RL = require('react-leaflet');
    MapContainer = RL.MapContainer;
    TileLayer = RL.TileLayer;
    CircleMarker = RL.CircleMarker;
    Popup = RL.Popup;
    useMapEvents = RL.useMapEvents;
  } catch (e) {
    console.log('Leaflet not loaded', e);
  }
}

// Native-only: WebView with embedded Leaflet (no Google Maps API key needed!)
let WebView: any;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').default;
  } catch (e) {
    console.log('WebView not loaded', e);
  }
}

function generateLeafletHTML(destinations: any[]): string {
  const destData = destinations
    .filter(d => d.latitude && d.longitude)
    .map(d => {
      // Derive color from risk_tier if risk_color is missing or default
      let dynamicColor = d.risk_color || '#4ADE80';
      if (!d.risk_color || d.risk_color === '#4ADE80' || d.risk_color === '#22C55E') {
        const tier = (d.risk_tier || 'risk.low').toLowerCase();
        if (tier.includes('high')) dynamicColor = '#EF4444'; // Colors.danger
        else if (tier.includes('moderate')) dynamicColor = '#F59E0B'; // Colors.warning
        else dynamicColor = '#4ADE80'; // Colors.success
      }
      
      return {
        lat: d.latitude,
        lng: d.longitude,
        color: dynamicColor,
        name: d.name || '',
        weather: d.weather || '',
        temp: d.temp || '0°C',
        score: d.suitability_score || 0,
        id: d.id || '',
        district: d.district || '',
      };
    });

  const destJSON = JSON.stringify(destData);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #090B0A; }
    #map { width: 100vw; height: 100vh; background: #090B0A; }
    .leaflet-popup-content-wrapper { background: #1a1f1e; color: #e8e8e8; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
    .leaflet-popup-tip { background: #1a1f1e; }
    .leaflet-popup-content { margin: 10px 14px; font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; }
    .leaflet-popup-content b { color: #fff; }
    .leaflet-control-zoom { display: none; }
    .leaflet-control-attribution { display: none; }
    .dest-btn { background:#4ADE80; color:#090B0A; border:none; padding:8px 14px; border-radius:20px; font-weight:bold; font-size:12px; margin-top:6px; width:100%; cursor:pointer; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [7.95, 80.7718],
      zoom: 7.4,
      minZoom: 7,
      maxBounds: [[5.5, 79.0], [10.2, 82.5]],
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(map);

    var dests = ${destJSON};
    dests.forEach(function(d) {
      var marker = L.circleMarker([d.lat, d.lng], {
        radius: 8, color: d.color, fillColor: d.color, fillOpacity: 0.8, weight: 2
      }).addTo(map);
      var html = '<b>' + d.name + '</b><br/>' + d.weather + ' | ' + d.temp + '<br/>Score: ' + d.score + '/100<br/><button class="dest-btn" data-id="' + d.id + '" data-name="' + d.name + '">View Full Details \u2197</button>';
      marker.bindPopup(html);
      marker.on('click', function() { marker.openPopup(); });
    });

    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('dest-btn')) {
        var id = e.target.getAttribute('data-id');
        var name = e.target.getAttribute('data-name');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'destination', id:id, name:name}));
        }
      }
    });
  </script>
</body>
</html>`;
}

export function ClimaMap({ destinations = [], onDistrictSelect, onDestinationSelect }: { destinations?: any[], onDistrictSelect?: (id: string) => void, onDestinationSelect?: (id: string, name: string) => void }) {
  const [customMarker, setCustomMarker] = React.useState<any>(null);

  const analyzeLocation = async (lat: number, lng: number) => {
    const inSriLanka = lat >= 5.8 && lat <= 9.9 && lng >= 79.5 && lng <= 82.0;
    if (!inSriLanka) {
      setCustomMarker({ latitude: lat, longitude: lng, loading: false, name: 'Outside Coverage', weather: 'N/A', temp: 0, suitability_score: 0, risk_color: Colors.textSecondary });
      return;
    }
    setCustomMarker({ latitude: lat, longitude: lng, loading: true, name: 'Analyzing...' });
    try {
      const eleRes = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
      const eleData = await eleRes.json();
      const elevation = eleData.elevation?.[0];
      if (elevation === undefined || elevation === null || elevation < -10) {
        setCustomMarker({ latitude: lat, longitude: lng, loading: false, name: 'Ocean / Sea', weather: 'N/A', temp: 0, suitability_score: 0, risk_color: Colors.info });
        return;
      }
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m`);
      const weatherData = await weatherRes.json();
      const temp = weatherData.current.temperature_2m;
      const precip = weatherData.current.precipitation;
      const wind = weatherData.current.wind_speed_10m;
      
      // Calculate anomaly
      const baselines = require('../../utils/historical_baselines.json');
      const month = new Date().getMonth() + 1;
      let avgPrecip = 0;
      // Try to match district roughly, otherwise fallback
      if (baselines['_FALLBACK_'] && baselines['_FALLBACK_'][month.toString()]) {
        avgPrecip = baselines['_FALLBACK_'][month.toString()].avg_precip;
      }
      const precip_anomaly = precip - (avgPrecip / 30); // avg is monthly, we want roughly daily or just compare raw if needed. Wait, Kaggle avg is monthly sum. So daily is / 30.
      
      const { predictDisasterRisk } = require('../../utils/EdgeInference');
      const riskTier = predictDisasterRisk(temp, precip, wind, elevation, precip_anomaly);
      const risk_map: any = { 'High': Colors.danger, 'Low': Colors.success, 'Moderate': Colors.warning };
      const color = risk_map[riskTier] || Colors.success;
      const safety_score = Math.max(0, 100 - (precip * 2) - wind);
      const suitability = Math.max(0, safety_score - Math.abs(temp - 26) * 2);
      const weatherDesc = precip > 5 ? 'Heavy Rain' : precip > 0.1 ? 'Rainy' : temp > 32 ? 'Hot & Sunny' : 'Clear & Pleasant';
      setCustomMarker({ latitude: lat, longitude: lng, loading: false, name: 'Analyzed Location', weather: weatherDesc, temp: Math.round(temp), suitability_score: Math.round(suitability), risk_color: color });
    } catch (e) {
      console.log('Error analyzing map location', e);
      setCustomMarker({ latitude: lat, longitude: lng, loading: false, name: 'Network Error', weather: 'N/A', temp: 0, suitability_score: 0, risk_color: Colors.textSecondary });
    }
  };

  // ─── WEB: react-leaflet ───
  if (Platform.OS === 'web') {
    injectLeafletStyles();
    if (!MapContainer) {
      return <View style={styles.fallback}><Text style={{ color: 'white' }}>Loading Map...</Text></View>;
    }

    const MapClickHandler = () => {
      useMapEvents({
        click: async (e: any) => {
          const { lat, lng } = e.latlng;
          await analyzeLocation(lat, lng);
        }
      });
      if (!customMarker) return null;
      return (
        <Popup position={[customMarker.latitude, customMarker.longitude]} onClose={() => setCustomMarker(null)}>
          <View style={styles.popupContainer}>
            <Text style={styles.popupTitle}>{customMarker.name}</Text>
            {customMarker.loading ? <Text style={styles.popupText}>Analyzing Risk...</Text> : (
              <>
                <Text style={styles.popupText}>{customMarker.weather} | {customMarker.temp}°C</Text>
                <Text style={{ ...styles.popupScore, color: customMarker.risk_color }}>Score: {customMarker.suitability_score}/100</Text>
              </>
            )}
          </View>
        </Popup>
      );
    };

    return (
      <View style={styles.container}>
        <MapContainer
          center={[7.8731, 80.7718]}
          zoom={7}
          minZoom={7}
          maxBounds={[[5.8, 79.5], [9.9, 82.0]]}
          style={{ height: '100%', width: '100%', backgroundColor: Colors.background }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapClickHandler />
          {destinations.map((dest) => (
            dest.latitude && dest.longitude ? (
              <CircleMarker
                key={dest.id}
                center={[dest.latitude, dest.longitude]}
                radius={8}
                pathOptions={{
                  color: dest.risk_color || Colors.accent,
                  fillColor: dest.risk_color || Colors.accent,
                  fillOpacity: 0.8,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => { onDistrictSelect?.(dest.district); }
                }}
              >
                <Popup>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => onDestinationSelect?.(dest.id, dest.name)}>
                    <View style={styles.popupContainer}>
                      <Text style={styles.popupTitle}>{dest.name}</Text>
                      <Text style={styles.popupText}>{dest.weather} | {dest.temp}°C</Text>
                      <Text style={styles.popupScore}>Score: {dest.suitability_score}/100</Text>
                      <Text style={{ color: Colors.accent, fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Click for full details ↗</Text>
                    </View>
                  </TouchableOpacity>
                </Popup>
              </CircleMarker>
            ) : null
          ))}
        </MapContainer>
      </View>
    );
  }

  // ─── NATIVE: WebView + Leaflet (no Google Maps API key needed!) ───
  if (!WebView) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={48} color={Colors.textSecondary} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>
          Map component not available.{'\n'}Please reinstall the app.
        </Text>
      </View>
    );
  }

  const html = generateLeafletHTML(destinations);
  // Create a unique key so WebView re-renders when data changes
  const mapKey = destinations.map(d => `${d.id}-${d.risk_color}`).join(',');

  return (
    <View style={styles.container}>
      <WebView
        key={mapKey}
        source={{ html }}
        style={{ flex: 1, backgroundColor: Colors.background }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Loading Risk Map...</Text>
          </View>
        )}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'destination' && data.id && data.name) {
              onDestinationSelect?.(data.id, data.name);
            } else if (data.type === 'district' && data.district) {
              onDistrictSelect?.(data.district);
            }
          } catch (e) {
            console.warn('WebView message parse error:', e);
          }
        }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  popupContainer: {
    padding: 4,
  },
  popupTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  popupText: {
    fontSize: 12,
  },
  popupScore: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  }
});
