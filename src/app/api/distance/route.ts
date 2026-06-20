import { NextResponse } from "next/server";
import { z } from "zod";

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

interface OpenRouteServiceResponse {
  routes?: Array<{
    summary?: {
      distance?: number;
    };
  }>;
  features?: Array<{
    properties?: {
      summary?: {
        distance?: number;
      };
    };
  }>;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENROUTESERVICE_API_KEY." },
      { status: 500 }
    );
  }

  const parsedBody = distanceRequestSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid distance request." },
      { status: 400 }
    );
  }

  const { origin, destination } = parsedBody.data;
  const fallbackDistanceKm = estimateRoadDistanceKm(origin, destination);

  let response: Response;

  try {
    response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
        }),
      }
    );
  } catch {
    return NextResponse.json(
      {
        distanceKm: fallbackDistanceKm,
        source: "fallback",
        warning: "Routing provider is unreachable. Used an approximate distance.",
      },
      { status: 200 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json({
      distanceKm: fallbackDistanceKm,
      source: "fallback",
      warning: `Routing provider failed. Used an approximate distance. ${errorText}`,
    });
  }

  const data = (await response.json()) as OpenRouteServiceResponse;
  const distanceMeters =
    data.routes?.[0]?.summary?.distance ??
    data.features?.[0]?.properties?.summary?.distance;

  if (typeof distanceMeters !== "number") {
    return NextResponse.json({
      distanceKm: fallbackDistanceKm,
      source: "fallback",
      warning: "Unable to parse route distance. Used an approximate distance.",
    });
  }

  return NextResponse.json({
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    source: "openrouteservice",
  });
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

  return Math.round(straightLineKm * 1.3 * 100) / 100;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
