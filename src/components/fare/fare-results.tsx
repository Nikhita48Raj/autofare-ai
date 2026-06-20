import type { FareEstimate } from "@/lib/fare";

interface FareResultsProps {
  estimate: FareEstimate | null;
}

export function FareResults({ estimate }: FareResultsProps) {
  if (!estimate) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
        <p className="text-base font-medium">Submit a route to see the fare breakdown.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-soft">
      <h3 className="text-xl font-semibold text-slate-900">Fare estimate</h3>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-500">Distance</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">{estimate.distanceKm} km</dd>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-500">Official fare</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">₹{estimate.officialFare.toFixed(2)}</dd>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-500">Night surcharge</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">₹{estimate.nightSurchargeAmount.toFixed(2)}</dd>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-500">Special charges</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">₹{estimate.specialCharges.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="mt-8 rounded-[1.5rem] bg-slate-950 p-6 text-white shadow-soft">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Street fare</p>
        <p className="mt-3 text-3xl font-semibold">₹{estimate.streetFare.toFixed(2)}</p>
        <p className="mt-2 text-sm text-slate-400">Expected street price for bargaining or dispute reporting.</p>
      </div>
    </div>
  );
}
