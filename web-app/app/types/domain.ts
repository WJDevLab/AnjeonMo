export interface ScooterDetails {
  id: string | null;
  modelName: string | null;
  batteryPercent: number | null;
  estimatedRangeKm: number | null;
  baseFareAmount: number | null;
  perMinuteFareAmount: number | null;
  currencyCode: string | null;
}

export interface MonthlySummary {
  rideCount: number | null;
  distanceKm: number | null;
  safetyCheckCount: number | null;
}

export interface RideStatistics {
  rideCount: number | null;
  totalDistanceKm: number | null;
  totalDurationSeconds: number | null;
  averageDurationSeconds: number | null;
  averageSpeedKph: number | null;
  safetyPassCount: number | null;
  helmetConfirmedCount: number | null;
  multipleRiderSuspectedCount: number | null;
  safetyBlockedCount: number | null;
  monthlyTrend: readonly unknown[];
  recentRides: readonly unknown[];
}

export const EMPTY_SCOOTER: ScooterDetails = {
  id: null,
  modelName: null,
  batteryPercent: null,
  estimatedRangeKm: null,
  baseFareAmount: null,
  perMinuteFareAmount: null,
  currencyCode: null,
};

export const EMPTY_MONTHLY_SUMMARY: MonthlySummary = {
  rideCount: null,
  distanceKm: null,
  safetyCheckCount: null,
};

export const EMPTY_RIDE_STATISTICS: RideStatistics = {
  rideCount: null,
  totalDistanceKm: null,
  totalDurationSeconds: null,
  averageDurationSeconds: null,
  averageSpeedKph: null,
  safetyPassCount: null,
  helmetConfirmedCount: null,
  multipleRiderSuspectedCount: null,
  safetyBlockedCount: null,
  monthlyTrend: [],
  recentRides: [],
};
