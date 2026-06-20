"use client";

import { FareForm } from "./fare-form";
import { FareResults } from "./fare-results";

export function FarePage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Estimate your auto fare in seconds.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Search pickup and drop locations using OpenStreetMap and calculate route distance with OpenRouteService.
        </p>
        <div className="mt-8">
          <FareForm />
        </div>
      </div>
      <FareResults estimate={null} />
    </div>
  );
}
