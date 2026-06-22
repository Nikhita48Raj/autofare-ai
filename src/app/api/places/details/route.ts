import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";

const detailsParamsSchema = z.object({
  placeId: z.string().trim().min(1),
});

interface GooglePlaceDetailsResponse {
  result?: {
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  };
  status: string;
  error_message?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedParams = detailsParamsSchema.safeParse({
    placeId: url.searchParams.get("placeId"),
  });

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Missing or invalid placeId parameter." },
      { status: 400 }
    );
  }

  const { placeId } = parsedParams.data;

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

  const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock-")) {
    // Return mock coordinates for developer testing
    if (placeId === "mock-place-id-1") {
      return NextResponse.json({ lat: 12.9718915, lng: 77.641151 }); // Indiranagar
    }
    if (placeId === "mock-place-id-2") {
      return NextResponse.json({ lat: 12.978253, lng: 77.640656 }); // Indiranagar Double Road
    }
    return NextResponse.json({ lat: 12.9716, lng: 77.5946 }); // Bengaluru Central
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "geometry",
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
      {
        next: {
          revalidate: 24 * 60 * 60, // Cache place details for 24 hours
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Google Places Details API request failed." },
        { status: response.status }
      );
    }

    const data = (await response.json()) as GooglePlaceDetailsResponse;

    if (data.status !== "OK") {
      console.error("Google Places Details error status:", data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Places Details returned status: ${data.status}` },
        { status: 502 }
      );
    }

    const location = data.result?.geometry?.location;

    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
      return NextResponse.json(
        { error: "Location coordinates not found in details response." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
    });
  } catch (error) {
    console.error("Place details fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error during place details fetch." },
      { status: 500 }
    );
  }
}
