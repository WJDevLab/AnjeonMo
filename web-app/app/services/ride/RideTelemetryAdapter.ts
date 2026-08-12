import type { RideStatus, RideTelemetry } from "@/app/types/ride";

import type {
  RideAdapterResult,
  RideTelemetryAdapterContract,
} from "./contracts";

const RIDE_STATUSES = new Set<RideStatus>([
  "idle",
  "starting",
  "riding",
  "ended",
  "error",
]);

function recordFrom(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

function nullableNonNegativeNumber(
  value: unknown,
): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export class RideTelemetryAdapter implements RideTelemetryAdapterContract {
  adapt(raw: unknown, receivedAt: string): RideAdapterResult {
    const payload = recordFrom(raw);
    if (!payload) {
      return { ok: false, errorCode: "RIDE_PAYLOAD_INVALID" };
    }

    const status = payload.status;
    if (
      typeof status !== "string" ||
      !RIDE_STATUSES.has(status as RideStatus)
    ) {
      return { ok: false, errorCode: "RIDE_STATUS_INVALID" };
    }

    const rideId = nullableString(payload.rideId);
    const startedAt = nullableString(payload.startedAt);
    const currencyCode = nullableString(payload.currencyCode);
    const errorCode = nullableString(payload.errorCode);
    const distanceKm = nullableNonNegativeNumber(payload.distanceKm);
    const elapsedSeconds = nullableNonNegativeNumber(payload.elapsedSeconds);
    const fareAmount = nullableNonNegativeNumber(payload.fareAmount);

    if (
      rideId === undefined ||
      startedAt === undefined ||
      currencyCode === undefined ||
      errorCode === undefined ||
      distanceKm === undefined ||
      elapsedSeconds === undefined ||
      fareAmount === undefined
    ) {
      return { ok: false, errorCode: "RIDE_FIELDS_INVALID" };
    }

    const value: RideTelemetry = {
      status: status as RideStatus,
      rideId,
      startedAt,
      distanceKm,
      elapsedSeconds,
      fareAmount,
      currencyCode,
      receivedAt,
      errorCode,
    };
    return { ok: true, value };
  }
}
