// ClimaLens — Itinerary Store (Zustand + Supabase Sync)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { Destination } from './useDestinationsStore';

export interface ItineraryStop {
  id: string;
  itinerary_id: string;
  destination_id: string;
  stop_order: number;
  visit_date?: string;
  travel_minutes_to_next: number;
  predicted_temp?: number;
  predicted_precip?: number;
  predicted_wind?: number;
  predicted_risk: string;
  notes?: string;
  // Joined destination data (local only)
  destination?: Destination;
}

export interface Itinerary {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  total_risk_score: number;
  total_travel_minutes: number;
  status: string;
  stops: ItineraryStop[];
}

interface ItineraryState {
  currentItinerary: Itinerary | null;
  allItineraries: Itinerary[];
  loading: boolean;
  error: string | null;

  // Actions
  loadOrCreateItinerary: () => Promise<void>;
  loadAllItineraries: () => Promise<void>;
  createNewItinerary: (title?: string) => Promise<void>;
  switchItinerary: (id: string) => Promise<void>;
  renameItinerary: (id: string, newTitle: string) => Promise<void>;
  deleteItinerary: (id: string) => Promise<void>;
  addStop: (destination: Destination) => Promise<boolean>;
  removeStop: (stopId: string) => Promise<void>;
  reorderStops: (fromIndex: number, toIndex: number) => Promise<void>;
  updateTripAnalysis: (totalRisk: number, totalMinutes: number) => Promise<void>;
  isInItinerary: (destinationId: string) => boolean;
}

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate travel time in minutes (avg 40 km/h for Sri Lanka roads)
export function estimateTravelMinutes(
  lat1?: number, lon1?: number,
  lat2?: number, lon2?: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const km = haversineKm(lat1, lon1, lat2, lon2);
  return Math.round((km / 40) * 60);
}

export const useItineraryStore = create<ItineraryState>()(
  persist(
    (set, get) => ({
      currentItinerary: null,
  allItineraries: [],
  loading: false,
  error: null,

  loadOrCreateItinerary: async () => {
    const current = get().currentItinerary;

    // If we already have an itinerary in memory (especially local), don't overwrite it
    if (current && current.stops.length > 0) {
      return;
    }
    // Also skip if we have a local itinerary (even with 0 stops) - it was just created
    if (current && current.id.startsWith('local_')) {
      return;
    }

    set({ loading: true, error: null });
    try {
      // Try to load an existing draft itinerary
      const { data: existing, error: fetchErr } = await supabase
        .from('itineraries')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      let itinerary: Itinerary;

      if (existing && existing.length > 0) {
        // Load existing itinerary with its stops
        const { data: stops, error: stopsErr } = await supabase
          .from('itinerary_stops')
          .select('*')
          .eq('itinerary_id', existing[0].id)
          .order('stop_order', { ascending: true });

        if (stopsErr) throw stopsErr;

        itinerary = {
          ...existing[0],
          stops: stops || [],
        };
      } else {
        // Create a new itinerary
        const { data: newIt, error: createErr } = await supabase
          .from('itineraries')
          .insert({ title: 'My Sri Lanka Trip', status: 'draft' })
          .select()
          .single();

        if (createErr) throw createErr;

        itinerary = {
          ...newIt,
          stops: [],
        };
      }

      set({ currentItinerary: itinerary, loading: false });
    } catch (err: any) {
      console.error('Error loading itinerary:', err);
      // Fallback: only create a local itinerary if we don't already have one
      if (!get().currentItinerary) {
        set({
          currentItinerary: {
            id: `local_${Date.now()}`,
            title: 'My Sri Lanka Trip',
            total_risk_score: 0,
            total_travel_minutes: 0,
            status: 'draft',
            stops: [],
          },
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    }
    // Also load the list of all itineraries
    get().loadAllItineraries();
  },

  loadAllItineraries: async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const localTrips = get().allItineraries.filter(t => t.id.startsWith('local_'));
      
      // Keep local trips at the top, followed by synced trips
      set({ allItineraries: [...localTrips, ...(data || [])] });
    } catch (err) {
      console.error('Error loading all itineraries:', err);
    }
  },

  createNewItinerary: async (title = 'My New Trip') => {
    set({ loading: true, error: null });
    
    // Preserve the current itinerary in allItineraries before switching
    const currentItin = get().currentItinerary;
    if (currentItin) {
      const existsInAll = get().allItineraries.some(i => i.id === currentItin.id);
      if (!existsInAll) {
        set({ allItineraries: [currentItin, ...get().allItineraries] });
      } else {
        // Update the existing entry with latest stops
        set({
          allItineraries: get().allItineraries.map(i => 
            i.id === currentItin.id ? { ...i, stops: currentItin.stops } : i
          )
        });
      }
    }
    
    try {
      const { data: newIt, error: createErr } = await supabase
        .from('itineraries')
        .insert({ title, status: 'draft' })
        .select()
        .single();

      if (createErr) throw createErr;

      const itinerary = {
        ...newIt,
        stops: [],
      };

      set({ currentItinerary: itinerary, loading: false });
      get().loadAllItineraries();
    } catch (err: any) {
      console.error('Error creating itinerary:', err);
      // Fallback
      const newIt = {
        id: `local_${Date.now()}`,
        title,
        total_risk_score: 0,
        total_travel_minutes: 0,
        status: 'draft',
        stops: [],
      };
      set({
        currentItinerary: newIt,
        allItineraries: [newIt, ...get().allItineraries],
        loading: false,
      });
    }
  },

  switchItinerary: async (id: string) => {
    if (get().currentItinerary?.id === id) return;
    
    // Save current itinerary's stops to allItineraries before switching
    const currentItin = get().currentItinerary;
    if (currentItin) {
      set({
        allItineraries: get().allItineraries.map(i =>
          i.id === currentItin.id ? { ...i, stops: currentItin.stops } : i
        )
      });
    }
    
    set({ loading: true, error: null });
    try {
      if (id.startsWith('local_')) {
        const local = get().allItineraries.find(i => i.id === id);
        if (local) {
          // Preserve the stored stops instead of resetting to []
          set({ currentItinerary: { ...local }, loading: false });
        }
        return;
      }

      const { data: existing, error: fetchErr } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;

      const { data: stops, error: stopsErr } = await supabase
        .from('itinerary_stops')
        .select('*')
        .eq('itinerary_id', id)
        .order('stop_order', { ascending: true });

      if (stopsErr) throw stopsErr;

      // For cloud itineraries, also check if we have richer local data (with destination objects)
      const localVersion = get().allItineraries.find(i => i.id === id);
      const mergedStops = (stops || []).map((s: any) => {
        const localStop = localVersion?.stops?.find(ls => ls.id === s.id);
        return localStop ? { ...s, destination: localStop.destination } : s;
      });

      const itinerary = {
        ...existing,
        stops: mergedStops,
      };

      set({ currentItinerary: itinerary, loading: false });
    } catch (err: any) {
      console.error('Error switching itinerary:', err);
      // Fallback: try to load from local allItineraries
      const local = get().allItineraries.find(i => i.id === id);
      if (local) {
        set({ currentItinerary: { ...local }, loading: false });
      } else {
        set({ loading: false, error: err.message });
      }
    }
  },

  renameItinerary: async (id: string, newTitle: string) => {
    const { currentItinerary, allItineraries } = get();

    // Optimistic UI update
    if (currentItinerary?.id === id) {
      set({ currentItinerary: { ...currentItinerary, title: newTitle } });
    }
    set({
      allItineraries: allItineraries.map(i => i.id === id ? { ...i, title: newTitle } : i)
    });

    if (!id.startsWith('local_')) {
      try {
        await supabase
          .from('itineraries')
          .update({ title: newTitle })
          .eq('id', id);
      } catch (err) {
        console.error('Error renaming itinerary:', err);
      }
    }
  },

  addStop: async (destination: Destination) => {
    const state = get();
    if (!state.currentItinerary) {
      await get().loadOrCreateItinerary();
    }

    const itinerary = get().currentItinerary;
    if (!itinerary) return false;

    // Check if already in itinerary
    if (itinerary.stops.some(s => s.destination_id === destination.id)) {
      return false;
    }

    const newOrder = itinerary.stops.length;

    // Calculate travel time from the last stop
    let travelMinutes = 0;
    if (itinerary.stops.length > 0) {
      const lastStop = itinerary.stops[itinerary.stops.length - 1];
      const lastDest = lastStop.destination;
      if (lastDest) {
        travelMinutes = estimateTravelMinutes(
          lastDest.latitude, lastDest.longitude,
          destination.latitude, destination.longitude
        );
      }
    }

    try {
      let isLocal = itinerary.id.startsWith('local_');
      let targetItineraryId = itinerary.id;

      // Seamless Cloud Migration
      if (isLocal) {
        const { data: migratedItin, error: migrateErr } = await supabase
          .from('itineraries')
          .insert({ title: itinerary.title, status: itinerary.status })
          .select()
          .single();

        if (!migrateErr && migratedItin) {
          targetItineraryId = migratedItin.id;
          isLocal = false;
          
          // Migrate existing stops
          if (itinerary.stops.length > 0) {
            const stopsToInsert = itinerary.stops.map(s => ({
              itinerary_id: targetItineraryId,
              destination_id: s.destination_id,
              stop_order: s.stop_order,
              travel_minutes_to_next: s.travel_minutes_to_next,
              predicted_risk: s.predicted_risk || 'Low'
            }));
            await supabase.from('itinerary_stops').insert(stopsToInsert);
          }

          // Update the in-memory ID so the rest of the function and app uses the cloud version
          set({
            currentItinerary: { ...itinerary, id: targetItineraryId },
            allItineraries: get().allItineraries.map(i => i.id === itinerary.id ? { ...i, id: targetItineraryId } : i)
          });
          itinerary.id = targetItineraryId;
        }
      }

      const stopData = {
        itinerary_id: targetItineraryId,
        destination_id: destination.id,
        stop_order: newOrder,
        travel_minutes_to_next: 0,
        predicted_risk: 'Low',
      };

      // Try to insert into Supabase
      if (!isLocal) {
        // Update previous stop's travel_minutes_to_next
        if (itinerary.stops.length > 0) {
          const lastStop = itinerary.stops[itinerary.stops.length - 1];
          await supabase
            .from('itinerary_stops')
            .update({ travel_minutes_to_next: travelMinutes })
            .eq('id', lastStop.id);
        }

        const { data: inserted, error } = await supabase
          .from('itinerary_stops')
          .insert(stopData)
          .select()
          .single();

        if (error) throw error;

        const newStop: ItineraryStop = {
          ...inserted,
          destination,
        };

        // Update last stop's travel time locally
        const updatedStops = [...itinerary.stops];
        if (updatedStops.length > 0) {
          updatedStops[updatedStops.length - 1] = {
            ...updatedStops[updatedStops.length - 1],
            travel_minutes_to_next: travelMinutes,
          };
        }
        updatedStops.push(newStop);

        set({
          currentItinerary: {
            ...itinerary,
            stops: updatedStops,
          },
        });
      } else {
        // Local-only fallback
        const newStop: ItineraryStop = {
          id: `local_stop_${Date.now()}`,
          ...stopData,
          destination,
        };

        const updatedStops = [...itinerary.stops];
        if (updatedStops.length > 0) {
          updatedStops[updatedStops.length - 1] = {
            ...updatedStops[updatedStops.length - 1],
            travel_minutes_to_next: travelMinutes,
          };
        }
        updatedStops.push(newStop);

        set({
          currentItinerary: {
            ...itinerary,
            stops: updatedStops,
          },
        });
      }

      // Sync local allItineraries state for both local and cloud so the UI reflects it
      const updatedItin = get().currentItinerary;
      if (updatedItin) {
        const { allItineraries } = get();
        set({
          allItineraries: allItineraries.map(i => i.id === updatedItin.id ? { ...i, stops: updatedItin.stops } : i)
        });
      }

      return true;
    } catch (err: any) {
      console.error('Error adding stop:', err);
      set({ error: err.message });
      return false;
    }
  },

  removeStop: async (stopId: string) => {
    const itinerary = get().currentItinerary;
    if (!itinerary) return;

    try {
      if (!itinerary.id.startsWith('local_') && !stopId.startsWith('local_')) {
        await supabase.from('itinerary_stops').delete().eq('id', stopId);
      }

      const updatedStops = itinerary.stops
        .filter(s => s.id !== stopId)
        .map((s, idx) => ({ ...s, stop_order: idx }));

      // Recalculate travel times
      for (let i = 0; i < updatedStops.length - 1; i++) {
        const curr = updatedStops[i].destination;
        const next = updatedStops[i + 1].destination;
        if (curr && next) {
          updatedStops[i].travel_minutes_to_next = estimateTravelMinutes(
            curr.latitude, curr.longitude,
            next.latitude, next.longitude
          );
        }
      }
      if (updatedStops.length > 0) {
        updatedStops[updatedStops.length - 1].travel_minutes_to_next = 0;
      }

      set({
        currentItinerary: { ...itinerary, stops: updatedStops },
      });
      // Sync local allItineraries state
      if (itinerary.id.startsWith('local_')) {
        const { allItineraries } = get();
        set({
          allItineraries: allItineraries.map(i => i.id === itinerary.id ? { ...i, stops: updatedStops } : i)
        });
      }
    } catch (err: any) {
      console.error('Error removing stop:', err);
    }
  },

  reorderStops: async (fromIndex: number, toIndex: number) => {
    const itinerary = get().currentItinerary;
    if (!itinerary) return;

    const stops = [...itinerary.stops];
    const [moved] = stops.splice(fromIndex, 1);
    stops.splice(toIndex, 0, moved);

    // Reassign order and recalculate travel times
    for (let i = 0; i < stops.length; i++) {
      stops[i] = { ...stops[i], stop_order: i };
      if (i < stops.length - 1) {
        const curr = stops[i].destination;
        const next = stops[i + 1].destination;
        if (curr && next) {
          stops[i].travel_minutes_to_next = estimateTravelMinutes(
            curr.latitude, curr.longitude,
            next.latitude, next.longitude
          );
        }
      } else {
        stops[i].travel_minutes_to_next = 0;
      }
    }

    set({ currentItinerary: { ...itinerary, stops } });

    // Sync to Supabase
    if (!itinerary.id.startsWith('local_')) {
      for (const stop of stops) {
        if (!stop.id.startsWith('local_')) {
          await supabase
            .from('itinerary_stops')
            .update({
              stop_order: stop.stop_order,
              travel_minutes_to_next: stop.travel_minutes_to_next,
            })
            .eq('id', stop.id);
        }
      }
    }
  },

  deleteItinerary: async (id: string) => {
    try {
      if (!id.startsWith('local_')) {
        await supabase.from('itinerary_stops').delete().eq('itinerary_id', id);
        await supabase.from('itineraries').delete().eq('id', id);
      }

      const newAll = get().allItineraries.filter(i => i.id !== id);
      set({ allItineraries: newAll });

      // If we deleted the active one, clear it or load the newest one
      if (get().currentItinerary?.id === id) {
        set({ currentItinerary: null });
        if (newAll.length > 0) {
          get().switchItinerary(newAll[0].id);
        } else {
          get().loadOrCreateItinerary();
        }
      }
    } catch (err: any) {
      console.error('Error deleting itinerary:', err);
    }
  },

  updateTripAnalysis: async (totalRisk: number, totalMinutes: number) => {
    const itinerary = get().currentItinerary;
    if (!itinerary) return;

    set({
      currentItinerary: {
        ...itinerary,
        total_risk_score: totalRisk,
        total_travel_minutes: totalMinutes,
      },
    });

    if (!itinerary.id.startsWith('local_')) {
      await supabase
        .from('itineraries')
        .update({ total_risk_score: totalRisk, total_travel_minutes: totalMinutes })
        .eq('id', itinerary.id);
    }
  },

  isInItinerary: (destinationId: string) => {
    const itinerary = get().currentItinerary;
    if (!itinerary) return false;
    return itinerary.stops.some(s => s.destination_id === destinationId);
  },
}), {
  name: 'itinerary-storage',
  storage: createJSONStorage(() => AsyncStorage),
}));
