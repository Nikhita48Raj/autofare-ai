"use client";

import { useState } from "react";
import Link from "next/link";
import { type FareReport, deriveOverchargeMetrics } from "@/types/fare-report";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DisputeCardProps {
  report: FareReport;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorten long location names to first segment before the first comma. */
function shortName(name: string): string {
  return name.split(",")[0]?.trim() ?? name;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        highlight
          ? "border border-red-200 bg-red-50"
          : "border border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-widest ${
          highlight ? "text-red-500" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold ${
          highlight ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DisputeCard({ report }: DisputeCardProps) {
  const [copied, setCopied] = useState(false);
  // BUG-04 FIX: track clipboard errors so the user gets actionable feedback
  const [copyError, setCopyError] = useState(false);

  const metrics = deriveOverchargeMetrics(report);

  // BUG-04 FIX: replaced the empty catch {} with a two-stage approach:
  //   1. Modern Clipboard API (async, secure contexts)
  //   2. Legacy execCommand fallback (sync, older browsers / non-HTTPS)
  // If both fail the button now shows an error message instead of being silent.
  // BUG-11 FIX: handleCopyLink is now `async` and returns a Promise so that
  // handleShare can `await` it correctly.
  const handleCopyLink = async (): Promise<void> => {
    const url = window.location.href;

    // Stage 1 — modern async Clipboard API (requires HTTPS / localhost)
    if (
      typeof navigator.clipboard?.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch {
        // Fall through to legacy method — do not show error yet
      }
    }

    // Stage 2 — legacy execCommand fallback (works in HTTP contexts)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      // Render off-screen so it doesn't cause layout shift
      textArea.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        throw new Error("execCommand copy returned false");
      }
    } catch {
      // Both methods failed — tell the user to copy manually
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  };

  // BUG-11 FIX: `await handleCopyLink()` so the clipboard Promise resolves
  // before the function exits. Previously the fallback was called without
  // await, meaning setCopied(true) could never run before GC cleared the call.
  const handleShare = async () => {
    const shareData = {
      title: `Auto Fare Dispute — ${shortName(report.pickup_name)} → ${shortName(report.drop_name)}`,
      text: `I was overcharged for an auto ride in India. Official fare: ₹${report.official_fare.toFixed(0)}, Demanded: ₹${report.actual_fare?.toFixed(0) ?? "N/A"}. Check the dispute:`,
      url: window.location.href,
    };

    if (
      typeof navigator.share === "function" &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share dialog — no-op
      }
    } else {
      // Fallback: copy link to clipboard
      await handleCopyLink();
    }
  };

  // ---------------------------------------------------------------------------
  // BUG-06 FIX: Compute fare breakdown from stored report values instead of
  // re-running the formula inline (which could produce rounding mismatches).
  //
  // official_fare in DB = base (₹25) + distance fare only (no night surcharge).
  // Night surcharge and special charges are stored separately.
  // ---------------------------------------------------------------------------
  const derivedBaseFare = 25;
  const derivedDistanceFare =
    Math.round(Math.max(0, (report.distance_km - 1) * 16) * 100) / 100;
  // Night surcharge is 20% of the meter fare (base + distance)
  const derivedNightSurcharge = report.night_surcharge
    ? Math.round(report.official_fare * 0.2 * 100) / 100
    : 0;
  const derivedTotal =
    Math.round(
      (report.official_fare + derivedNightSurcharge + report.special_charges) *
        100
    ) / 100;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1 border-b border-slate-100 bg-slate-950 px-8 py-7 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
          AutoFare Dispute Report
        </p>
        {/* BUG-17: h1 is inside a client component — server renders the shell
            so this is visible to crawlers post-hydration. The page wrapper
            (server component) carries the SEO metadata via generateMetadata. */}
        <h1 className="text-xl font-semibold leading-snug text-white">
          {shortName(report.pickup_name)}
          <span className="mx-2 font-light text-slate-400">→</span>
          {shortName(report.drop_name)}
        </h1>
        <p className="text-sm text-slate-400">{formatDate(report.created_at)}</p>
      </div>

      {/* ── Route detail ────────────────────────────────────────────────────── */}
      <div className="space-y-1 bg-slate-50 px-8 py-4 text-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
            A
          </span>
          <span className="text-slate-700">{report.pickup_name}</span>
        </div>
        <div className="ml-2.5 h-4 w-px border-l border-dashed border-slate-300" />
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
            B
          </span>
          <span className="text-slate-700">{report.drop_name}</span>
        </div>
      </div>

      {/* ── Fare Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-8 py-6 sm:grid-cols-4">
        <StatBox label="Distance" value={`${report.distance_km} km`} />
        <StatBox
          label="Official Fare"
          value={`₹${report.official_fare.toFixed(0)}`}
        />
        <StatBox
          label="Street Fare"
          value={`₹${report.street_fare.toFixed(0)}`}
        />
        {report.actual_fare !== null ? (
          <StatBox
            label="Demanded"
            value={`₹${report.actual_fare.toFixed(0)}`}
            highlight={metrics?.isOvercharged ?? false}
          />
        ) : (
          <StatBox label="Demanded" value="Not reported" />
        )}
      </div>

      {/* ── Overcharge Alert ──────────────────────────────────────────────────── */}
      {metrics && metrics.isOvercharged && (
        <div className="mx-8 mb-6 rounded-2xl bg-red-600 px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-red-200">
            Overcharge Detected
          </p>
          <p className="mt-1.5 text-3xl font-extrabold">
            +₹{metrics.overchargeAmount.toFixed(0)}
          </p>
          <p className="mt-1 text-sm text-red-200">
            {metrics.overchargePercent}% above official meter fare
          </p>
        </div>
      )}

      {/* Fair ride badge */}
      {metrics && !metrics.isOvercharged && report.actual_fare !== null && (
        <div className="mx-8 mb-6 rounded-2xl bg-green-600 px-6 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-green-200">
            Fair Ride
          </p>
          <p className="mt-1 text-sm text-green-100">
            The fare paid was within the expected street price range.
          </p>
        </div>
      )}

      {/* ── Fare Breakdown ────────────────────────────────────────────────────── */}
      {/* BUG-06 FIX: replaced inline formula recalculation with derived values
          that respect stored official_fare. Labels now accurately reflect what
          each line item represents. Grand total row added. */}
      <div className="mx-8 mb-6 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Fare Breakdown
        </h2>
        <Row label="Base fare" value={`₹${derivedBaseFare.toFixed(2)}`} />
        <Row
          label="Distance fare"
          value={`₹${derivedDistanceFare.toFixed(2)}`}
        />
        <div className="border-t border-slate-200 pt-2">
          <Row
            label="Meter fare (base + distance)"
            value={`₹${report.official_fare.toFixed(2)}`}
            bold
          />
        </div>
        {report.night_surcharge && (
          <Row
            label="Night surcharge (20%)"
            value={`₹${derivedNightSurcharge.toFixed(2)}`}
          />
        )}
        {report.special_charges > 0 && (
          <Row
            label="Special charges"
            value={`₹${report.special_charges.toFixed(2)}`}
          />
        )}
        {(report.night_surcharge || report.special_charges > 0) && (
          <div className="border-t border-slate-200 pt-2">
            <Row
              label="Total payable"
              value={`₹${derivedTotal.toFixed(2)}`}
              bold
            />
          </div>
        )}

        {/* Surcharge badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {report.night_surcharge && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700">
              🌙 Night Surcharge Applied
            </span>
          )}
          {report.special_charges > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
              ⚡ Special Charges: ₹{report.special_charges.toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* ── Driver Notes ──────────────────────────────────────────────────────── */}
      {report.notes && (
        <div className="mx-8 mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-600">
            Driver Behaviour / Notes
          </p>
          <p className="text-sm leading-relaxed text-amber-900">
            {report.notes}
          </p>
        </div>
      )}

      {/* ── Share CTAs ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-8 py-6 sm:flex-row">
        {/* BUG-04 FIX: button now shows three distinct states:
            default → copied (success) → error (copy failed, use address bar) */}
        <button
          type="button"
          id="dispute-copy-link"
          onClick={handleCopyLink}
          className={cn(
            "flex-1 rounded-full border px-5 py-3 text-sm font-semibold transition",
            copied
              ? "border-green-200 bg-green-50 text-green-700"
              : copyError
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
          )}
        >
          {copied
            ? "✓ Link copied!"
            : copyError
            ? "Copy failed — use address bar"
            : "Copy dispute link"}
        </button>
        <button
          type="button"
          id="dispute-share"
          onClick={handleShare}
          className="flex-1 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
        >
          Share dispute →
        </button>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400">
        Report ID:{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
          {report.id}
        </code>
        <span className="mx-2">·</span>
        Powered by{" "}
        <Link href="/" className="font-semibold text-blue-600 hover:underline">
          AutoFare
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Inline Row helper
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "font-semibold text-slate-900" : "text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
