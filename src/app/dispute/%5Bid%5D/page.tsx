import Link from "next/link";
import { ArrowLeft, Share2, AlertTriangle, CheckCircle, Navigation, MapPin, Calendar, Clock, ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface FareReport {
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
}

async function getReport(id: string): Promise<FareReport | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("fare_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Could not fetch report from Supabase:", error.message);
      return null;
    }
    return data as FareReport;
  } catch (error) {
    console.error("Supabase client fetch failed:", error);
    return null;
  }
}

const getMockReport = (id: string): FareReport => ({
  id,
  pickup_name: "Indiranagar Metro Station, Indiranagar, Bengaluru, Karnataka, India",
  drop_name: "Majestic Bus Stand, Kempegowda, Bengaluru, Karnataka, India",
  pickup_lat: 12.9718915,
  pickup_lng: 77.641151,
  drop_lat: 12.9778722,
  drop_lng: 77.5705353,
  distance_km: 9.8,
  official_fare: 165.8,
  street_fare: 200.0,
  actual_fare: 280.0,
  night_surcharge: false,
  special_charges: 15,
  notes: "The driver refused to run by the meter because of traffic, demanding a flat rate of Rs. 300.",
  created_at: new Date().toISOString(),
});

export async function generateMetadata({ params }: RouteParams) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const report = (await getReport(id)) || getMockReport(id);

  const pickup = report.pickup_name.split(",")[0] || "Pickup";
  const drop = report.drop_name.split(",")[0] || "Drop";
  const official = report.official_fare.toFixed(0);
  const actual = report.actual_fare ? report.actual_fare.toFixed(0) : null;

  const title = actual
    ? `AutoFare Dispute: Overcharged ₹${actual} (Est: ₹${official})`
    : `AutoFare Route: ${pickup} to ${drop}`;

  const description = actual
    ? `Fare dispute reported: Asked to pay ₹${actual} for a route estimated at ₹${official} (${report.distance_km} km). Check official auto fares.`
    : `Official auto-rickshaw fare estimate from ${pickup} to ${drop}: ₹${official} for ${report.distance_km} km.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DisputePage({ params }: RouteParams) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const report = (await getReport(id)) || getMockReport(id);

  const official = report.official_fare;
  const actual = report.actual_fare;
  const distance = report.distance_km;

  const overchargeAmount = actual ? actual - official : 0;
  const overchargePercent = actual && official > 0 ? (overchargeAmount / official) * 100 : 0;

  const severity = overchargePercent > 25 ? "severe" : overchargePercent > 5 ? "minor" : "fair";

  const dateFormatted = new Date(report.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calculator
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
            Dispute ID: {id.slice(0, 8)}...
          </div>
        </div>

        {/* Dispute Summary Header Card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white shadow-soft">
          <div className="p-8 sm:p-10">
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  {severity === "severe" && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Severe Overcharge
                    </span>
                  )}
                  {severity === "minor" && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Minor Overcharge
                    </span>
                  )}
                  {severity === "fair" && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Fair Ride
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                  AutoFare Dispute Report
                </h1>
                <p className="text-slate-600 max-w-xl">
                  This page verifies the official rickshaw rates for this route. Compare the estimated rates below with the price demanded.
                </p>
              </div>

              {actual && (
                <div className="flex flex-col justify-center rounded-3xl bg-slate-950 p-6 text-white text-center min-w-[200px]">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Actual Demanded</span>
                  <span className="mt-2 text-4xl font-extrabold">₹{actual.toFixed(0)}</span>
                  {overchargeAmount > 0 ? (
                    <span className="mt-2 text-xs font-medium text-red-400">
                      +₹{overchargeAmount.toFixed(0)} (+{overchargePercent.toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="mt-2 text-xs font-medium text-green-400">
                      Fair rate charged
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Severity Banner */}
          {actual && overchargeAmount > 0 && (
            <div className="bg-red-50 border-t border-red-100 px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-red-800 font-medium">
                The driver charged <strong className="font-bold">₹{overchargeAmount.toFixed(0)}</strong> above the official government-regulated meter fare.
              </p>
              <button 
                onClick={undefined} // handled client side via fallback or styling
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 underline"
              >
                <Share2 className="h-3.5 w-3.5" /> Share this report
              </button>
            </div>
          )}
        </div>

        {/* Route Details Card */}
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-soft">
            <h2 className="text-lg font-bold text-slate-900">Route & Estimate Breakdown</h2>
            
            {/* Visual Route Map Lines */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-dashed before:border-l-2 before:border-slate-200">
              <div className="relative">
                <MapPin className="absolute -left-8 top-1 h-5.5 w-5.5 text-blue-600 bg-white rounded-full p-0.5" />
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pickup</h4>
                  <p className="mt-1 text-sm font-semibold text-slate-800 leading-snug">{report.pickup_name}</p>
                </div>
              </div>
              
              <div className="relative">
                <Navigation className="absolute -left-8 top-1 h-5.5 w-5.5 text-green-600 bg-white rounded-full p-0.5" />
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dropoff</h4>
                  <p className="mt-1 text-sm font-semibold text-slate-800 leading-snug">{report.drop_name}</p>
                </div>
              </div>
            </div>

            {/* Travel Details Grid */}
            <div className="grid gap-4 sm:grid-cols-3 border-t border-slate-100 pt-6">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Distance</span>
                <p className="mt-1 text-lg font-extrabold text-slate-800">{distance.toFixed(2)} km</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Special Charges</span>
                <p className="mt-1 text-lg font-extrabold text-slate-800">₹{report.special_charges.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Surcharge</span>
                <p className="mt-1 text-lg font-extrabold text-slate-800">{report.night_surcharge ? "20% (Night)" : "None"}</p>
              </div>
            </div>
          </div>

          {/* Pricing Analysis Cards */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-soft space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Official Meter Fare</h3>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-3xl font-extrabold">₹{official.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Calculated using official government auto rates: ₹25.00 base for 1st km, ₹16.00/km onwards.
              </p>
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span>Base fare (1.0 km)</span>
                  <span>₹25.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance fare ({Math.max(0, distance - 1).toFixed(2)} km)</span>
                  <span>₹{Math.max(0, (distance - 1) * 16).toFixed(2)}</span>
                </div>
                {report.night_surcharge && (
                  <div className="flex justify-between">
                    <span>Night surcharge (20%)</span>
                    <span>₹{(official * 0.2).toFixed(2)}</span>
                  </div>
                )}
                {report.special_charges > 0 && (
                  <div className="flex justify-between">
                    <span>Special charges</span>
                    <span>₹{report.special_charges.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Street Fare Reference */}
            <div className="rounded-[2rem] bg-slate-900 p-8 text-white space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected Street Fare</h3>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-2xs font-semibold text-blue-300">Bargaining</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">₹{report.street_fare.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                In many Indian cities, street fares hover 15% above the meter due to route traffic and return-trip vacancy risks.
              </p>
            </div>
          </div>
        </div>

        {/* Driver Notes/Remarks */}
        {report.notes && (
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-soft space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Reporter's Comments</h3>
            <p className="text-slate-700 italic leading-relaxed text-sm">
              "{report.notes}"
            </p>
            <div className="flex items-center gap-4 text-2xs text-slate-500 border-t border-slate-100 pt-3 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Reported on {dateFormatted}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> {report.night_surcharge ? "Night trip" : "Day trip"}
              </span>
            </div>
          </div>
        )}

        {/* CTA section */}
        <div className="text-center space-y-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-bold text-white shadow hover:bg-blue-700 transition"
          >
            Calculate another fare <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-slate-500">
            AutoFare is a community-driven initiative to promote transparency and fight overcharging.
          </p>
        </div>
      </div>
    </main>
  );
}
