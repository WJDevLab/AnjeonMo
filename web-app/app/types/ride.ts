export type RideStatus = "idle" | "starting" | "riding" | "ended" | "error";

export interface RideTelemetry {
  status: RideStatus;
  rideId: string | null;
  startedAt: string | null;
  distanceKm: number | null;
  elapsedSeconds: number | null;
  fareAmount: number | null;
  currencyCode: string | null;
  receivedAt: string | null;
  errorCode: string | null;
}

export const EMPTY_RIDE_TELEMETRY: Readonly<RideTelemetry> = Object.freeze({
  status: "idle",
  rideId: null,
  startedAt: null,
  distanceKm: null,
  elapsedSeconds: null,
  fareAmount: null,
  currencyCode: null,
  receivedAt: null,
  errorCode: null,
});
