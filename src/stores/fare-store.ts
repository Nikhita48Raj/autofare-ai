import { create } from "zustand";

export interface LocationOption {
  description: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface FareState {
  pickup: LocationOption | null;
  dropoff: LocationOption | null;
  nightSurcharge: boolean;
  specialCharges: number;
  setPickup: (option: LocationOption | null) => void;
  setDropoff: (option: LocationOption | null) => void;
  setNightSurcharge: (value: boolean) => void;
  setSpecialCharges: (value: number) => void;
  reset: () => void;
}

export const useFareStore = create<FareState>((set) => ({
  pickup: null,
  dropoff: null,
  nightSurcharge: false,
  specialCharges: 0,
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setNightSurcharge: (nightSurcharge) => set({ nightSurcharge }),
  setSpecialCharges: (specialCharges) => set({ specialCharges }),
  reset: () =>
    set({
      pickup: null,
      dropoff: null,
      nightSurcharge: false,
      specialCharges: 0,
    }),
}));
