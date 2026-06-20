export interface FareEstimate {
  distanceKm: number;
  baseFare: number;
  distanceFare: number;
  officialFare: number;
  nightSurchargeAmount: number;
  specialCharges: number;
  streetFare: number;
  totalFare: number;
}

export const calculateFareEstimate = (
  distanceKm: number,
  specialCharges: number,
  nightSurcharge: boolean
): FareEstimate => {
  const roundedDistance = Math.max(0, Math.round(distanceKm * 100) / 100);
  const baseFare = 25;
  const perKmRate = 16;
  const distanceFare = roundedDistance <= 1 ? 0 : (roundedDistance - 1) * perKmRate;
  const officialFare = Math.round((baseFare + distanceFare) * 100) / 100;
  const nightSurchargeAmount = nightSurcharge
    ? Math.round(officialFare * 0.2 * 100) / 100
    : 0;
  const specialChargeAmount = Math.max(0, Math.round(specialCharges * 100) / 100);
  const totalFare = Math.round((officialFare + nightSurchargeAmount + specialChargeAmount) * 100) / 100;
  const streetFare = Math.round(Math.max(totalFare * 1.15, totalFare + 10) * 100) / 100;

  return {
    distanceKm: roundedDistance,
    baseFare,
    distanceFare,
    officialFare,
    nightSurchargeAmount,
    specialCharges: specialChargeAmount,
    streetFare,
    totalFare,
  };
};
