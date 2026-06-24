"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateFareEstimate, type FareEstimate } from "@/lib/fare";
import {
  estimateDistanceKm,
  fetchGoogleSuggestions,
  fetchPlaceDetails,
  type GoogleSuggestion,
} from "@/lib/maps";
import { cn } from "@/lib/utils";
// BUG-02 FIX: Wire the Zustand store so state is shared across the app,
// not siloed exclusively inside this component.
import { useFareStore } from "@/stores/fare-store";

const formSchema = {
  pickup: (value: string) => value.trim().length >= 3,
  dropoff: (value: string) => value.trim().length >= 3,
};

export function FareCalculator() {
  const router = useRouter();

  // ── Shared state via Zustand store ───────────────────────────────────────
  // BUG-02 FIX: replaced 4 isolated useStates with the Zustand store so any
  // future component (e.g. a map panel) can subscribe to the same values.
  const {
    pickup: pickupSelection,
    dropoff: dropoffSelection,
    nightSurcharge,
    specialCharges,
    setPickup,
    setDropoff,
    setNightSurcharge,
    setSpecialCharges,
  } = useFareStore();

  // ── Local autocomplete UI state (does not need to be global) ────────────
  const [pickupQuery, setPickupQuery] = useState(
    pickupSelection?.description ?? ""
  );
  const [dropoffQuery, setDropoffQuery] = useState(
    dropoffSelection?.description ?? ""
  );
  const [pickupSuggestions, setPickupSuggestions] = useState<
    GoogleSuggestion[]
  >([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<
    GoogleSuggestion[]
  >([]);

  // ── Loading states ────────────────────────────────────────────────────────
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  // BUG-09 FIX: Split the single isLoadingSuggestions boolean into two
  // independent flags so pickup and dropoff spinners don't interfere.
  const [isLoadingPickupSuggestions, setIsLoadingPickupSuggestions] =
    useState(false);
  const [isLoadingDropoffSuggestions, setIsLoadingDropoffSuggestions] =
    useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // ── ML Prediction ─────────────────────────────────────────────────────────
  const [predictedOvercharge, setPredictedOvercharge] = useState<
    number | null
  >(null);
  const [mlSource, setMlSource] = useState<string | null>(null);

  // ── Results ───────────────────────────────────────────────────────────────
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Dispute / overcharge form ─────────────────────────────────────────────
  const [actualFare, setActualFare] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  // BUG-05 FIX: track whether user tried to submit without entering demanded fare
  const [actualFareWarning, setActualFareWarning] = useState(false);

  // ── Clear selection helpers ───────────────────────────────────────────────
  const clearPickupSelection = () => setPickup(null);
  const clearDropoffSelection = () => setDropoff(null);

  // ── Autocomplete fetcher ──────────────────────────────────────────────────
  const fetchSuggestionsFor = async (
    query: string,
    setter: React.Dispatch<React.SetStateAction<GoogleSuggestion[]>>,
    loadingSetter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (query.trim().length < 3) {
      setter([]);
      return;
    }
    loadingSetter(true);
    try {
      const results = await fetchGoogleSuggestions(query);
      setter(results);
    } catch (error) {
      console.error("Autocomplete error", error);
      setter([]);
    } finally {
      loadingSetter(false);
    }
  };

  // ── Place selection handlers ──────────────────────────────────────────────
  const handleSelectPickup = async (option: GoogleSuggestion) => {
    setErrorMessage(null);
    setIsLoadingDetails(true);
    try {
      const coords = await fetchPlaceDetails(option.placeId);
      // Store only after coordinates are fully resolved — lat/lng guaranteed non-null
      setPickup({
        description: option.description,
        placeId: option.placeId,
        lat: coords.lat,
        lng: coords.lng,
      });
      setPickupQuery(option.description);
      setPickupSuggestions([]);
    } catch (error) {
      console.error("Failed to fetch coordinates for selection", error);
      setErrorMessage(
        "Could not resolve the selected location coordinates. Please try again."
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSelectDropoff = async (option: GoogleSuggestion) => {
    setErrorMessage(null);
    setIsLoadingDetails(true);
    try {
      const coords = await fetchPlaceDetails(option.placeId);
      setDropoff({
        description: option.description,
        placeId: option.placeId,
        lat: coords.lat,
        lng: coords.lng,
      });
      setDropoffQuery(option.description);
      setDropoffSuggestions([]);
    } catch (error) {
      console.error("Failed to fetch coordinates for selection", error);
      setErrorMessage(
        "Could not resolve the selected location coordinates. Please try again."
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // ── Debounced autocomplete triggers ──────────────────────────────────────
  // BUG-12 FIX: Use bare setTimeout (global) instead of window.setTimeout.
  // window.setTimeout is unnecessary in a "use client" component and fails
  // in non-browser test environments.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupSelection?.description !== pickupQuery) {
        fetchSuggestionsFor(
          pickupQuery,
          setPickupSuggestions,
          setIsLoadingPickupSuggestions
        );
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pickupQuery, pickupSelection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dropoffSelection?.description !== dropoffQuery) {
        fetchSuggestionsFor(
          dropoffQuery,
          setDropoffSuggestions,
          setIsLoadingDropoffSuggestions
        );
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [dropoffQuery, dropoffSelection]);

  // ── Fare calculation ──────────────────────────────────────────────────────
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setEstimate(null);
    setActualFare(null);
    setNotes("");
    setPredictedOvercharge(null);
    setMlSource(null);
    setActualFareWarning(false);

    if (
      !formSchema.pickup(pickupQuery) ||
      !formSchema.dropoff(dropoffQuery)
    ) {
      setErrorMessage("Please enter valid pickup and drop locations.");
      return;
    }

    if (!pickupSelection || !dropoffSelection) {
      setErrorMessage(
        "Please select both pickup and drop locations from the suggestions."
      );
      return;
    }

    if (pickupSelection.placeId === dropoffSelection.placeId) {
      setErrorMessage("Pickup and drop locations must be different.");
      return;
    }

    if (specialCharges < 0) {
      setErrorMessage("Special charges cannot be negative.");
      return;
    }

    setIsLoadingDistance(true);

    try {
      const distanceKm = await estimateDistanceKm(
        { lat: pickupSelection.lat, lng: pickupSelection.lng },
        { lat: dropoffSelection.lat, lng: dropoffSelection.lng }
      );

      const result = calculateFareEstimate(
        distanceKm,
        specialCharges,
        nightSurcharge
      );
      setEstimate(result);

      // Trigger ML Prediction in parallel — never blocks the UI
      fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_lat: pickupSelection.lat,
          pickup_lng: pickupSelection.lng,
          drop_lat: dropoffSelection.lat,
          drop_lng: dropoffSelection.lng,
          distance_km: distanceKm,
        }),
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("ML Predict API request failed.");
        })
        .then((data: { predicted_overcharge?: number; source?: string }) => {
          if (typeof data.predicted_overcharge === "number") {
            setPredictedOvercharge(data.predicted_overcharge);
            setMlSource(data.source || "xgboost_model");
          }
        })
        .catch((error) => {
          console.warn("Prediction endpoint query error:", error);
        });
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to calculate distance. Please check the selected locations and try again."
      );
    } finally {
      setIsLoadingDistance(false);
    }
  };

  // ── Dispute submission ────────────────────────────────────────────────────
  const handleShareDispute = async () => {
    if (!pickupSelection || !dropoffSelection || !estimate) return;

    // BUG-05 FIX: Block submit and show inline warning when demanded fare is missing.
    // Previously, clicking "Share Dispute Page" with no actualFare silently submitted
    // an empty report that rendered as "Demanded: Not reported" on the dispute page.
    if (!actualFare || actualFare <= 0) {
      setActualFareWarning(true);
      return;
    }

    setActualFareWarning(false);
    setErrorMessage(null);
    setIsSubmittingReport(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_name: pickupSelection.description,
          drop_name: dropoffSelection.description,
          pickup_lat: pickupSelection.lat,
          pickup_lng: pickupSelection.lng,
          drop_lat: dropoffSelection.lat,
          drop_lng: dropoffSelection.lng,
          distance_km: estimate.distanceKm,
          official_fare: estimate.officialFare,
          street_fare: estimate.streetFare,
          actual_fare: actualFare,
          night_surcharge: nightSurcharge,
          special_charges: specialCharges,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errBody?.error ?? "API call failed.");
      }

      const data = (await response.json()) as {
        id: string;
        warning?: string;
      };
      router.push(`/dispute/${data.id}`);
    } catch (error) {
      console.error("Report submit error:", error);
      setErrorMessage(
        "Could not submit the dispute report. Please try again."
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ── Instruction labels ────────────────────────────────────────────────────
  const pickupInstructions = useMemo(
    () =>
      pickupSelection
        ? "✓ Location confirmed"
        : "Choose a pickup location from the list.",
    [pickupSelection]
  );

  const dropoffInstructions = useMemo(
    () =>
      dropoffSelection
        ? "✓ Location confirmed"
        : "Choose a drop location from the list.",
    [dropoffSelection]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_0.85fr]">
      {/* ── Left: Input form ── */}
      <div className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-soft">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
            Fare Calculator
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">
            Estimate routes and dispute fares with confidence.
          </h2>
          <p className="max-w-2xl text-slate-600">
            Search pickup and drop locations using Google Places API, calculate
            route distance using Google Distance Matrix, and compare official
            versus street fare estimates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          {/* ── Pickup ── */}
          <div className="grid gap-3">
            <Label htmlFor="pickup" className="text-slate-700">
              Pickup location
            </Label>
            <div className="relative">
              <Input
                id="pickup"
                value={pickupQuery}
                onChange={(event) => {
                  clearPickupSelection();
                  setPickupQuery(event.target.value);
                }}
                placeholder="Search pickup location"
                className={cn(
                  "h-auto rounded-2xl px-4 py-3 text-base text-slate-900 focus-visible:ring-2",
                  pickupSelection
                    ? "border-blue-300 focus:ring-blue-200"
                    : "border-slate-200 focus:ring-blue-200"
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p
                className={cn(
                  "text-sm",
                  pickupSelection
                    ? "font-medium text-blue-600"
                    : "text-slate-500"
                )}
              >
                {pickupInstructions}
              </p>
              {/* BUG-09 FIX: now uses the dedicated pickup loading flag */}
              {isLoadingPickupSuggestions ? (
                <span className="animate-pulse text-sm text-blue-600">
                  Searching…
                </span>
              ) : null}
            </div>
            {pickupSuggestions.length > 0 && (
              <ul className="max-h-64 overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
                {pickupSuggestions.map((option) => (
                  <li key={option.placeId}>
                    <button
                      type="button"
                      onClick={() => handleSelectPickup(option)}
                      disabled={isLoadingDetails}
                      className="w-full rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {option.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Dropoff ── */}
          <div className="grid gap-3">
            <Label htmlFor="dropoff" className="text-slate-700">
              Drop location
            </Label>
            <div className="relative">
              <Input
                id="dropoff"
                value={dropoffQuery}
                onChange={(event) => {
                  clearDropoffSelection();
                  setDropoffQuery(event.target.value);
                }}
                placeholder="Search drop location"
                className={cn(
                  "h-auto rounded-2xl px-4 py-3 text-base text-slate-900 focus-visible:ring-2",
                  dropoffSelection
                    ? "border-blue-300 focus:ring-blue-200"
                    : "border-slate-200 focus:ring-blue-200"
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p
                className={cn(
                  "text-sm",
                  dropoffSelection
                    ? "font-medium text-blue-600"
                    : "text-slate-500"
                )}
              >
                {dropoffInstructions}
              </p>
              {/* BUG-09 FIX: now uses the dedicated dropoff loading flag */}
              {isLoadingDropoffSuggestions ? (
                <span className="animate-pulse text-sm text-blue-600">
                  Searching…
                </span>
              ) : null}
            </div>
            {dropoffSuggestions.length > 0 && (
              <ul className="max-h-64 overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
                {dropoffSuggestions.map((option) => (
                  <li key={option.placeId}>
                    <button
                      type="button"
                      onClick={() => handleSelectDropoff(option)}
                      disabled={isLoadingDetails}
                      className="w-full rounded-2xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {option.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Special charges + Night surcharge ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specialCharges" className="text-slate-700">
                Special charges
              </Label>
              <Input
                id="specialCharges"
                type="number"
                step="0.5"
                min="0"
                value={specialCharges}
                onChange={(event) =>
                  setSpecialCharges(Number(event.target.value))
                }
                className="h-auto rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200"
                placeholder="Toll, waiting, luggage"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <Label htmlFor="nightSurcharge" className="text-slate-700">
                  Night surcharge
                </Label>
                <p className="text-sm text-slate-500">20% after 10 PM</p>
              </div>
              <Checkbox
                id="nightSurcharge"
                checked={nightSurcharge}
                onCheckedChange={(checked) =>
                  setNightSurcharge(checked === true)
                }
              />
            </div>
          </div>

          {isLoadingDetails ? (
            <p className="animate-pulse rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Resolving coordinates… Please wait.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            className="rounded-full px-6 py-3"
            size="lg"
            disabled={isLoadingDistance || isLoadingDetails}
          >
            {isLoadingDistance ? "Calculating route…" : "Calculate fare"}
          </Button>
        </form>
      </div>

      {/* ── Right: Results panel ── */}
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-950">
            Estimated fare output
          </h3>
          {estimate ? (
            <div className="mt-6 space-y-6">
              {/* Distance + Official fare */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Distance</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {estimate.distanceKm} km
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Official fare</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    ₹{estimate.officialFare.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Street fare */}
              <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  Street fare
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  ₹{estimate.streetFare.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Expected street price for bargaining or dispute reporting.
                </p>
              </div>

              {/* ML Predicted Overcharge Panel */}
              {predictedOvercharge !== null && (
                <div className="space-y-2 rounded-[1.5rem] border border-blue-100 bg-blue-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      ML Overcharge Predictor
                    </h4>
                    <span className="origin-right scale-90 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      {mlSource === "xgboost_model"
                        ? "XGBoost Active"
                        : "Heuristic Active"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-slate-900">
                    ML predicts a typical overcharge of{" "}
                    <strong className="font-extrabold text-blue-700">
                      ₹{predictedOvercharge.toFixed(0)}
                    </strong>{" "}
                    above meter for this trip.
                  </p>
                  <p className="text-[10px] leading-normal text-slate-500">
                    Calculated using distance, coordinates, and local hotspot
                    statistics.
                  </p>
                </div>
              )}

              {/* Fare breakdown */}
              <div className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Base fare</span>
                  <span>₹{estimate.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Distance fare</span>
                  <span>₹{estimate.distanceFare.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Night surcharge</span>
                  <span>₹{estimate.nightSurchargeAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Special charges</span>
                  <span>₹{estimate.specialCharges.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-950">
                  <span>Total</span>
                  <span>₹{estimate.totalFare.toFixed(2)}</span>
                </div>
              </div>

              {/* Dispute Submission Box */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <h4 className="text-base font-semibold text-slate-950">
                    Did you get overcharged?
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Generate a dispute page to share on social media or report
                    to the community.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="actualFare"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Actual fare demanded (₹){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="actualFare"
                    type="number"
                    min="0"
                    placeholder="What did the driver ask for?"
                    value={actualFare ?? ""}
                    onChange={(event) => {
                      setActualFare(Number(event.target.value) || null);
                      if (actualFareWarning) setActualFareWarning(false);
                    }}
                    className={cn(
                      "h-auto rounded-xl px-3 py-2 text-sm text-slate-950 focus-visible:ring-1 focus-visible:ring-blue-300",
                      actualFareWarning
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    )}
                  />
                  {/* BUG-05 FIX: Inline warning instead of silently submitting */}
                  {actualFareWarning && (
                    <p className="text-xs font-medium text-red-600">
                      Please enter the fare the driver demanded before
                      generating a dispute page.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="notes"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Driver behavior / remarks
                  </Label>
                  <textarea
                    id="notes"
                    placeholder="E.g., Refused to turn on the meter, demanded flat ₹300, rain surcharge, luggage issues…"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-sm text-slate-950 outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleShareDispute}
                  disabled={isSubmittingReport}
                  className="w-full rounded-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-sm hover:shadow"
                >
                  {isSubmittingReport
                    ? "Generating dispute page…"
                    : "Share Dispute Page"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
              <p className="text-base font-medium">
                Complete the form to generate an estimate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
