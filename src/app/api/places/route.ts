import { NextResponse } from "next/server";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().trim().min(3).max(120),
});

interface NominatimSearchResult {
  display_name: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedParams = searchParamsSchema.safeParse({
    q: url.searchParams.get("q"),
  });

  if (!parsedParams.success) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q: parsedParams.data.q,
    format: "json",
    addressdetails: "0",
    limit: "6",
    countrycodes: "in",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "AutoFare/1.0 (https://autofare.ai)",
      },
      next: {
        revalidate: 60 * 60,
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Location search failed." },
      { status: response.status }
    );
  }

  const results = (await response.json()) as NominatimSearchResult[];

  return NextResponse.json({
    suggestions: results.map((item) => ({
      description: item.display_name,
      placeId: `${item.osm_type}-${item.osm_id}`,
      lat: Number(item.lat),
      lng: Number(item.lon),
    })),
  });
}
