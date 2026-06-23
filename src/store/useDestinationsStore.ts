import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export interface Destination {
  id: string;
  name: string;
  district: string;
  risk_tier: string;
  risk_color: string;
  suitability_score: number;
  tags: string[];
  activities?: string[];
  weather: string;
  temp: string;
  latitude?: number;
  longitude?: number;
  optimal_months?: number[];
}

interface DestinationsState {
  destinations: Destination[];
  loading: boolean;
  error: string | null;
  fetchDestinations: () => Promise<void>;
  subscribeToDestinations: () => void;
  unsubscribeFromDestinations: () => void;
  searchOnline: (query: string) => Promise<Destination | null>;
}

let subscription: any = null;

export const useDestinationsStore = create<DestinationsState>((set, get) => ({
  destinations: [],
  loading: false,
  error: null,
  fetchDestinations: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('suitability_score', { ascending: false });

      if (error) throw error;
      set({ destinations: data as Destination[], loading: false });
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
      set({ error: err.message, loading: false });
    }
  },
  searchOnline: async (query: string) => {
    try {
      set({ loading: true });
      // 1. Geocode with OpenStreetMap Nominatim
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}+Sri+Lanka&format=json&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) {
        set({ loading: false, error: 'Location not found' });
        return null;
      }
      
      const { lat, lon, display_name } = geoData[0];
      const name = display_name.split(',')[0];
      
      // 2. Predict Risk via Backend
      const aiRes = await fetch('http://127.0.0.1:8000/predict-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) })
      });
      const aiData = await aiRes.json();
      
      // 3. Create temp destination
      const newDest: Destination = {
        id: `temp_${Date.now()}`,
        name: name,
        district: 'Searched Location',
        risk_tier: aiData.risk_tier,
        risk_color: aiData.risk_color,
        suitability_score: aiData.suitability_score,
        tags: [],
        weather: aiData.weather,
        temp: `${aiData.temp}°C`,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
      
      set(state => ({ 
        destinations: [newDest, ...state.destinations],
        loading: false 
      }));
      return newDest;
    } catch (err: any) {
      console.error('Online search failed:', err);
      set({ loading: false, error: err.message });
      return null;
    }
  },
  subscribeToDestinations: () => {
    if (subscription) return;
    subscription = supabase
      .channel('public:destinations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'destinations' }, (payload) => {
        set((state) => ({
          destinations: state.destinations.map((d) =>
            d.id === payload.new.id ? { ...d, ...payload.new } : d
          ).sort((a, b) => b.suitability_score - a.suitability_score)
        }));
      })
      .subscribe();
  },
  unsubscribeFromDestinations: () => {
    if (subscription) {
      supabase.removeChannel(subscription);
      subscription = null;
    }
  }
}));
