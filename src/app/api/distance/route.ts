import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";

const distanceRequestSchema = z.object({
  origin: z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  }),
  destination: z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  }),
});

interface GoogleDistanceMatrixResponse {
  rows?: Array<{
    elements?: Array<{
      distance?: {
        value?: number;
      };
      status: string;
    }>;
  }>;
  status: string;
  error_message?: string;
}

export async function POST(request: Request) {
  let env;
  try {
    env = getServerEnv();
  } catch (error) {
    console.error("Environment variables validation failed:", error);
    return NextResponse.json(
      { error: "Server environment misconfiguration." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsedBody = distanceRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid distance request parameters. Must specify origin and destination with lat/lng coordinates." },
      { status: 400 }
    );
  }

  const { origin, destination } = parsedBody.data;
  const fallbackDistanceKm = estimateRoadDistanceKm(origin, destination);

  const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock-")) {
    return NextResponse.json({
      distanceKm: fallbackDistanceKm,
      source: "fallback",
      warning: "Using simulated road distance (mock API key).",
    });
  }

  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    mode: "driving",
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
      {
        next: {
          revalidate: 24 * 60 * 60, // Cache distance calculations for 24 hours
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        distanceKm: fallbackDistanceKm,
        source: "fallback",
        warning: `Google Distance Matrix request failed (HTTP ${response.status}). Used an approximate distance.`,
      });
    }

    const data = (await response.json()) as GoogleDistanceMatrixResponse;

    if (data.status !== "OK") {
      console.error("Google Distance Matrix API error status:", data.status, data.error_message);
      return NextResponse.json({
        distanceKm: fallbackDistanceKm,
        source: "fallback",
        warning: `Google API returned status: ${data.status}. Used an approximate distance.`,
      });
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK" || typeof element.distance?.value !== "number") {
      console.warn("Distance Matrix elements check failed status:", element?.status);
      return NextResponse.json({
        distanceKm: fallbackDistanceKm,
        source: "fallback",
        warning: "Unable to find a valid driving route. Used an approximate distance.",
      });
    }

    const distanceMeters = element.distance.value;
    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;

    return NextResponse.json({
      distanceKm,
      source: "google-maps",
    });
  } catch (error) {
    console.error("Distance Matrix fetch error:", error);
    return NextResponse.json({
      distanceKm: fallbackDistanceKm,
      source: "fallback",
      warning: "Failed to connect to Google Distance Matrix. Used an approximate distance.",
    });
  }
}

const estimateRoadDistanceKm = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const straightLineKm =
    2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  // 1.3 is a typical routing curvature factor for urban Indian driving routes
  return Math.round(straightLineKm * 1.3 * 100) / 100;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
