import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";

const searchParamsSchema = z.object({
  q: z.string().trim().min(3).max(120),
});

interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
}

interface GoogleAutocompleteResponse {
  predictions?: GoogleAutocompletePrediction[];
  status: string;
  error_message?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedParams = searchParamsSchema.safeParse({
    q: url.searchParams.get("q"),
  });

  if (!parsedParams.success) {
    return NextResponse.json({ suggestions: [] });
  }

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
    // If it's a mock key, return dummy suggestions so developer test flows succeed
    return NextResponse.json({
      suggestions: [
        {
          description: `Mock: ${parsedParams.data.q} Metro Station, Bengaluru`,
          placeId: "mock-place-id-1",
        },
        {
          description: `Mock: ${parsedParams.data.q} Mall, Indiranagar`,
          placeId: "mock-place-id-2",
        },
      ],
    });
  }

  const params = new URLSearchParams({
    input: parsedParams.data.q,
    components: "country:in",
    types: "geocode|establishment",
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
      {
        next: {
          revalidate: 60 * 60, // Cache autocomplete results for 1 hour
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Google Places API request failed." },
        { status: response.status }
      );
    }

    const data = (await response.json()) as GoogleAutocompleteResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error status:", data.status, data.error_message);
      return NextResponse.json(
        { error: `Google Places API returned status: ${data.status}` },
        { status: 502 }
      );
    }

    const predictions = data.predictions ?? [];

    return NextResponse.json({
      suggestions: predictions.map((item) => ({
        description: item.description,
        placeId: item.place_id,
      })),
    });
  } catch (error) {
    console.error("Autocomplete fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error during suggestion fetch." },
      { status: 500 }
    );
  }
}
