import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type FareReport, deriveOverchargeMetrics } from "@/types/fare-report";
import { DisputeCard } from "./dispute-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// SEO — generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  let report: FareReport | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("fare_reports")
      .select("*")
      .eq("id", id)
      .single();
    report = data as FareReport | null;
  } catch {
    // Silently fall through — metadata will use generic fallback below
  }

  if (!report) {
    return {
      title: "Dispute Not Found | AutoFare",
      description: "This dispute report could not be found.",
    };
  }

  const metrics = deriveOverchargeMetrics(report);
  const overchargeText = metrics?.isOvercharged
    ? ` — overcharged by ₹${metrics.overchargeAmount.toFixed(0)} (${metrics.overchargePercent}%)`
    : "";

  const title = `Auto Fare Dispute: ${report.pickup_name.split(",")[0]} → ${report.drop_name.split(",")[0]} | AutoFare`;
  const description = `Official fare ₹${report.official_fare.toFixed(0)} for ${report.distance_km} km${overchargeText}. View and share this auto-rickshaw fare dispute report.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/dispute/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Mock report for development when Supabase has no data yet
// ---------------------------------------------------------------------------

function buildMockReport(id: string): FareReport {
  return {
    id,
    pickup_name: "Indiranagar Metro Station, Bengaluru, Karnataka, India",
    drop_name: "Majestic Bus Stand, KSR Bengaluru City Railway Station, Bengaluru, India",
    pickup_lat: 12.9784,
    pickup_lng: 77.6408,
    drop_lat: 12.9774,
    drop_lng: 77.5709,
    distance_km: 9.2,
    official_fare: 172.2,
    street_fare: 198.03,
    actual_fare: 300,
    night_surcharge: false,
    special_charges: 0,
    notes: "Driver refused to use the meter and demanded a flat ₹300 for a 9 km trip.",
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Page — Server Component
// ---------------------------------------------------------------------------

export default async function DisputePage({ params }: PageProps) {
  const { id } = await params;

  // Validate UUID format to avoid unnecessary DB queries
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  let report: FareReport | null = null;
  let isMock = false;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("fare_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      // If the DB has no row (e.g. table not yet created in dev), use mock data
      console.warn(`Dispute report ${id} not found in DB — using mock fallback.`, error?.message);
      report = buildMockReport(id);
      isMock = true;
    } else {
      report = data as FareReport;
    }
  } catch (err) {
    console.error("DisputePage DB error:", err);
    report = buildMockReport(id);
    isMock = true;
  }

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-8 lg:px-16">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-800">
            Calculator
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Dispute Report</span>
        </nav>

        {/* Dev-mode mock banner */}
        {isMock && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Dev preview:</strong> Supabase table not yet set up or report not found.
            Showing mock data. Run the SQL migration to enable real reports.
          </div>
        )}

        {/* Core dispute card */}
        <DisputeCard report={report} />

        {/* Footer CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 hover:shadow-md"
          >
            ← Check your own fare
          </Link>
        </div>
      </div>
    </main>
  );
}
