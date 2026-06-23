import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export interface HazardReport {
  id: string;
  type: string;
  description: string;
  district: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
}

interface HazardReportsState {
  reports: HazardReport[];
  loading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  addReport: (report: Omit<HazardReport, 'id' | 'created_at' | 'status'>) => Promise<void>;
}

export const useHazardReportsStore = create<HazardReportsState>((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  fetchReports: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ reports: data as HazardReport[], loading: false });
    } catch (err: any) {
      console.error('Error fetching hazard reports:', err);
      set({ error: err.message, loading: false });
    }
  },
  addReport: async (report) => {
    try {
      const { data, error } = await supabase
        .from('hazard_reports')
        .insert([report])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state with the new report
      const currentReports = get().reports;
      set({ reports: [data as HazardReport, ...currentReports] });
    } catch (err: any) {
      console.error('Error adding hazard report:', err);
      throw err;
    }
  }
}));
