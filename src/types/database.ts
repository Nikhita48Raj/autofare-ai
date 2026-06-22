export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      fare_reports: {
        Row: {
          id: string;
          pickup_name: string;
          drop_name: string;
          pickup_lat: number;
          pickup_lng: number;
          drop_lat: number;
          drop_lng: number;
          distance_km: number;
          official_fare: number;
          street_fare: number;
          actual_fare: number | null;
          night_surcharge: boolean;
          special_charges: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pickup_name: string;
          drop_name: string;
          pickup_lat: number;
          pickup_lng: number;
          drop_lat: number;
          drop_lng: number;
          distance_km: number;
          official_fare: number;
          street_fare: number;
          actual_fare?: number | null;
          night_surcharge?: boolean;
          special_charges?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pickup_name?: string;
          drop_name?: string;
          pickup_lat?: number;
          pickup_lng?: number;
          drop_lat?: number;
          drop_lng?: number;
          distance_km?: number;
          official_fare?: number;
          street_fare?: number;
          actual_fare?: number | null;
          night_surcharge?: boolean;
          special_charges?: number;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
