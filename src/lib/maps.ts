export interface GoogleSuggestion {
  description: string;
  placeId: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export const fetchGoogleSuggestions = async (
  query: string
): Promise<GoogleSuggestion[]> => {
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

  return data.suggestions.filter(isGoogleSuggestion);
};

const isGoogleSuggestion = (value: unknown): value is GoogleSuggestion => {
  if (!value || typeof value !== "object") return false;

  const suggestion = value as Record<string, unknown>;

  return (
    typeof suggestion.description === "string" &&
    typeof suggestion.placeId === "string"
  );
};

export const fetchPlaceDetails = async (
  placeId: string
): Promise<LocationCoordinates> => {
  if (!placeId) {
    throw new Error("Cannot fetch details for an empty place ID.");
  }

  const params = new URLSearchParams({ placeId });
  const response = await fetch(`/api/places/details?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to retrieve location coordinates.");
  }

  const data = (await response.json()) as { lat?: unknown; lng?: unknown };

  if (typeof data.lat !== "number" || typeof data.lng !== "number") {
    throw new Error("Invalid coordinate format returned by server.");
  }

  return {
    lat: data.lat,
    lng: data.lng,
  };
};

export const estimateDistanceKm = async (
  origin: LocationCoordinates,
  destination: LocationCoordinates
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
