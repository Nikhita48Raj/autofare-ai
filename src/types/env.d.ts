declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
      readonly NEXT_PUBLIC_SUPABASE_URL: string;
      readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      readonly SUPABASE_SERVICE_ROLE_KEY: string;
      readonly NEXT_PUBLIC_APP_URL: string;
      readonly OPENROUTESERVICE_API_KEY: string;
    }
  }
}

export {};
