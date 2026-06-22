"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateFareEstimate, type FareEstimate } from "@/lib/fare";
import { estimateDistanceKm, fetchGoogleSuggestions, fetchPlaceDetails, type GoogleSuggestion } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface LocationOption {
  description: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

const formSchema = {
  pickup: (value: string) => value.trim().length >= 3,
  dropoff: (value: string) => value.trim().length >= 3,
};

export function FareCalculator() {
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [pickupSelection, setPickupSelection] = useState<LocationOption | null>(null);
  const [dropoffSelection, setDropoffSelection] = useState<LocationOption | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<GoogleSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<GoogleSuggestion[]>([]);
  const [specialCharges, setSpecialCharges] = useState(0);
  const [nightSurcharge, setNightSurcharge] = useState(false);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const clearPickupSelection = () => {
    setPickupSelection(null);
  };

  const clearDropoffSelection = () => {
    setDropoffSelection(null);
  };

  const fetchSuggestions = async (
    query: string,
    setter: React.Dispatch<React.SetStateAction<GoogleSuggestion[]>>
  ) => {
    if (query.trim().length < 3) {
      setter([]);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const results = await fetchGoogleSuggestions(query);
      setter(results);
    } catch (error) {
      console.error("Autocomplete error", error);
      setter([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectPickup = async (option: GoogleSuggestion) => {
    setErrorMessage(null);
    setIsLoadingDetails(true);
    try {
      const coords = await fetchPlaceDetails(option.placeId);
      setPickupSelection({
        description: option.description,
        placeId: option.placeId,
        lat: coords.lat,
        lng: coords.lng,
      });
      setPickupQuery(option.description);
      setPickupSuggestions([]);
    } catch (error) {
      console.error("Failed to fetch coordinates for selection", error);
      setErrorMessage("Could not resolve the selected location coordinates. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSelectDropoff = async (option: GoogleSuggestion) => {
    setErrorMessage(null);
    setIsLoadingDetails(true);
    try {
      const coords = await fetchPlaceDetails(option.placeId);
      setDropoffSelection({
        description: option.description,
        placeId: option.placeId,
        lat: coords.lat,
        lng: coords.lng,
      });
      setDropoffQuery(option.description);
      setDropoffSuggestions([]);
    } catch (error) {
      console.error("Failed to fetch coordinates for selection", error);
      setErrorMessage("Could not resolve the selected location coordinates. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (pickupSelection?.description !== pickupQuery) {
        fetchSuggestions(pickupQuery, setPickupSuggestions);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pickupQuery, pickupSelection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (dropoffSelection?.description !== dropoffQuery) {
        fetchSuggestions(dropoffQuery, setDropoffSuggestions);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [dropoffQuery, dropoffSelection]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setEstimate(null);

    if (!formSchema.pickup(pickupQuery) || !formSchema.dropoff(dropoffQuery)) {
      setErrorMessage("Please enter valid pickup and drop locations.");
      return;
    }

    if (!pickupSelection || !dropoffSelection) {
      setErrorMessage("Please select both pickup and drop locations from the suggestions.");
      return;
    }

    if (pickupSelection.placeId === dropoffSelection.placeId) {
      setErrorMessage("Pickup and drop locations must be different.");
      return;
    }

    if (
      pickupSelection.lat === undefined ||
      pickupSelection.lng === undefined ||
      dropoffSelection.lat === undefined ||
      dropoffSelection.lng === undefined
    ) {
      setErrorMessage("Coordinates are not yet resolved. Please select the location again.");
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

      const result = calculateFareEstimate(distanceKm, specialCharges, nightSurcharge);
      setEstimate(result);
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

  const pickupInstructions = useMemo(
    () => (pickupSelection ? "Selected from suggestions" : "Choose a pickup location from the list."),
    [pickupSelection]
  );

  const dropoffInstructions = useMemo(
    () => (dropoffSelection ? "Selected from suggestions" : "Choose a drop location from the list."),
    [dropoffSelection]
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-soft">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Fare Calculator</p>
          <h2 className="text-3xl font-semibold text-slate-950">Estimate routes and dispute fares with confidence.</h2>
          <p className="max-w-2xl text-slate-600">
            Search pickup and drop locations using Google Places API, calculate route distance using Google Distance Matrix, and compare official versus street fare estimates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
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
                  pickupSelection ? "border-blue-300 focus:ring-blue-200" : "border-slate-200 focus:ring-blue-200"
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{pickupInstructions}</p>
              {isLoadingSuggestions ? (
                <span className="text-sm text-blue-600 animate-pulse">Loading suggestions...</span>
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
                  dropoffSelection ? "border-blue-300 focus:ring-blue-200" : "border-slate-200 focus:ring-blue-200"
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{dropoffInstructions}</p>
              {isLoadingSuggestions ? (
                <span className="text-sm text-blue-600 animate-pulse">Loading suggestions...</span>
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
                onChange={(event) => setSpecialCharges(Number(event.target.value))}
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
                onCheckedChange={(checked) => setNightSurcharge(checked === true)}
              />
            </div>
          </div>

          {isLoadingDetails ? (
            <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 animate-pulse">
              Resolving coordinates... Please wait.
            </p>
          ) : null}

          {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

          <Button type="submit" className="rounded-full px-6 py-3" size="lg" disabled={isLoadingDistance || isLoadingDetails}>
            {isLoadingDistance ? "Calculating route..." : "Calculate fare"}
          </Button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-950">Estimated fare output</h3>
          {estimate ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Distance</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{estimate.distanceKm} km</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Official fare</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">Rs. {estimate.officialFare.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Street fare</p>
                <p className="mt-3 text-3xl font-semibold">Rs. {estimate.streetFare.toFixed(2)}</p>
                <p className="mt-2 text-sm text-slate-400">Expected street price for bargaining or dispute reporting.</p>
              </div>
              <div className="grid gap-3 rounded-[1.5rem] bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Base fare</span>
                  <span>Rs. {estimate.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Distance fare</span>
                  <span>Rs. {estimate.distanceFare.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Night surcharge</span>
                  <span>Rs. {estimate.nightSurchargeAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Special charges</span>
                  <span>Rs. {estimate.specialCharges.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-950">
                  <span>Total</span>
                  <span>Rs. {estimate.totalFare.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
              <p className="text-base font-medium">Complete the form to generate an estimate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
