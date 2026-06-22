/**
 * Represents a single crowdsourced fare report stored in the `fare_reports`
 * Supabase table. This interface is the single source of truth for the shape
 * of report data across the dispute page, analytics dashboard, and ML pipeline.
 */
export interface FareReport {
  /** UUID primary key — also used as the shareable dispute page URL slug. */
  id: string;

  /** Human-readable pickup location name (from Google Places). */
  pickup_name: string;

  /** Human-readable drop location name (from Google Places). */
  drop_name: string;

  /** Latitude of the pickup location. */
  pickup_lat: number;

  /** Longitude of the pickup location. */
  pickup_lng: number;

  /** Latitude of the drop location. */
  drop_lat: number;

  /** Longitude of the drop location. */
  drop_lng: number;

  /** Road distance in kilometres (from Google Distance Matrix or Haversine fallback). */
  distance_km: number;

  /** Official auto fare computed by the fare engine (base + distance fare). */
  official_fare: number;

  /** Expected street fare (official + 15% buffer or + ₹10, whichever is higher). */
  street_fare: number;

  /**
   * The actual fare the driver demanded. Null when the user did not report
   * what they were charged (fare estimation only, no overcharge dispute).
   */
  actual_fare: number | null;

  /** Whether the 20% night surcharge was applied. */
  night_surcharge: boolean;

  /** Additional charges entered by the user (toll, luggage, waiting, etc.). */
  special_charges: number;

  /** Optional free-text notes about driver behaviour. Max 500 chars. */
  notes: string | null;

  /** ISO 8601 timestamp of when the report was created. */
  created_at: string;
}

/**
 * Computed overcharge metrics derived from a FareReport.
 * Used by the dispute page to render the overcharge summary card.
 */
export interface OverchargeMetrics {
  /** Absolute overcharge in rupees (actual_fare - official_fare). */
  overchargeAmount: number;

  /** Overcharge as a percentage above official fare. */
  overchargePercent: number;

  /** True when actual_fare exceeds street_fare — clearly unfair. */
  isOvercharged: boolean;
}

/**
 * Derives overcharge metrics from a FareReport.
 * Returns null when actual_fare is not present (estimation-only report).
 */
export function deriveOverchargeMetrics(report: FareReport): OverchargeMetrics | null {
  if (report.actual_fare === null) return null;

  const overchargeAmount = Math.round((report.actual_fare - report.official_fare) * 100) / 100;
  const overchargePercent =
    report.official_fare > 0
      ? Math.round((overchargeAmount / report.official_fare) * 1000) / 10
      : 0;

  return {
    overchargeAmount,
    overchargePercent,
    isOvercharged: report.actual_fare > report.street_fare,
  };
}
