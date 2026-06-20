export interface OsmSuggestion {
  description: string;
  placeId: string;
  lat: number;
  lng: number;
}

export const fetchOsmSuggestions = async (
  query: string
): Promise<OsmSuggestion[]> => {
  if (query.trim().length < 3) return [];

  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Location search request failed.");
  }

  const data = (await response.json()) as { suggestions?: unknown };

  if (!Array.isArray(data.suggestions)) {
    return [];
  }

  return data.suggestions.filter(isOsmSuggestion);
};

const isOsmSuggestion = (value: unknown): value is OsmSuggestion => {
  if (!value || typeof value !== "object") return false;

  const suggestion = value as Record<string, unknown>;

  return (
    typeof suggestion.description === "string" &&
    typeof suggestion.placeId === "string" &&
    typeof suggestion.lat === "number" &&
    typeof suggestion.lng === "number"
  );
};

export const estimateDistanceKm = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> => {
  const response = await fetch("/api/distance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ origin, destination }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;

    throw new Error(
      typeof errorBody?.error === "string"
        ? errorBody.error
        : "Distance calculation failed."
    );
  }

  const data = (await response.json()) as {
    distanceKm?: unknown;
    warning?: unknown;
  };

  if (typeof data.distanceKm !== "number") {
    throw new Error("Unable to parse route distance.");
  }

  return data.distanceKm;
};
