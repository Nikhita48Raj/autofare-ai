export const getGoogleMapsApiKey = (): string => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add it to your .env.local file."
    );
  }

  return key;
};
