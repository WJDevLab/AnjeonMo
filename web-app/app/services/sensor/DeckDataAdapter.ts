import type {
  FootDetectionStatus,
  FootPosition,
  FootRole,
  PressureRegion,
  RiderStatus,
  SensorIssue,
} from "@/app/types/sensor";

import type {
  AdapterResult,
  DeckReading,
  SensorDataAdapter,
} from "./contracts";
import {
  finiteNumberArray,
  isRecord,
  isUnitRatio,
  nullableString,
  parseRecord,
} from "./payloadUtils";

const FOOT_STATUSES = new Set<FootDetectionStatus>([
  "unknown",
  "checking",
  "normal",
  "multiplePressureRegions",
  "multipleRiderSuspected",
  "positionInvalid",
  "sensorUnavailable",
  "error",
]);

const RIDER_STATUSES = new Set<RiderStatus>([
  "unknown",
  "singleRider",
  "multipleRiderSuspected",
]);

const FOOT_ROLES = new Set<FootRole>(["left", "right", "unknown"]);

function malformed(code: string): AdapterResult<never> {
  const issue: SensorIssue = {
    source: "deckWifi",
    category: "malformed",
    code,
  };
  return { ok: false, issue };
}

function parseRegions(
  value: unknown,
): readonly PressureRegion[] | null | undefined {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return undefined;

  const regions: PressureRegion[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      !isUnitRatio(candidate.startRatio) ||
      !isUnitRatio(candidate.endRatio) ||
      candidate.startRatio > candidate.endRatio
    ) {
      return undefined;
    }

    const intensity = candidate.intensityRatio;
    if (intensity !== null && intensity !== undefined && !isUnitRatio(intensity)) {
      return undefined;
    }

    regions.push({
      id: candidate.id,
      startRatio: candidate.startRatio,
      endRatio: candidate.endRatio,
      intensityRatio: intensity ?? null,
    });
  }
  return regions;
}

function parsePositions(
  value: unknown,
): readonly FootPosition[] | null | undefined {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return undefined;

  const positions: FootPosition[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      !isUnitRatio(candidate.longitudinalRatio) ||
      typeof candidate.role !== "string" ||
      !FOOT_ROLES.has(candidate.role as FootRole)
    ) {
      return undefined;
    }

    const intensity = candidate.intensityRatio;
    if (intensity !== null && intensity !== undefined && !isUnitRatio(intensity)) {
      return undefined;
    }

    positions.push({
      id: candidate.id,
      longitudinalRatio: candidate.longitudinalRatio,
      role: candidate.role as FootRole,
      intensityRatio: intensity ?? null,
    });
  }
  return positions;
}

/**
 * Default contract: JSON text/object from a Wi-Fi WebSocket endpoint.
 * The adapter is the only place that knows this raw contract.
 */
export class DeckDataAdapter implements SensorDataAdapter<unknown, DeckReading> {
  adapt(raw: unknown): AdapterResult<DeckReading> {
    const payload = parseRecord(raw);
    if (!payload) return malformed("DECK_PAYLOAD_INVALID");

    const footDetectionStatus = payload.footDetectionStatus;
    if (
      typeof footDetectionStatus !== "string" ||
      !FOOT_STATUSES.has(footDetectionStatus as FootDetectionStatus)
    ) {
      return malformed("DECK_STATUS_INVALID");
    }

    const riderStatus = payload.riderStatus ?? "unknown";
    if (
      typeof riderStatus !== "string" ||
      !RIDER_STATUSES.has(riderStatus as RiderStatus)
    ) {
      return malformed("DECK_RIDER_STATUS_INVALID");
    }

    const pressureValues = finiteNumberArray(payload.pressureValues);
    const detectedPressureRegions = parseRegions(
      payload.detectedPressureRegions,
    );
    const estimatedFootPositions = parsePositions(payload.estimatedFootPositions);
    if (
      pressureValues === undefined ||
      detectedPressureRegions === undefined ||
      estimatedFootPositions === undefined
    ) {
      return malformed("DECK_POSITION_DATA_INVALID");
    }

    const confirmedFootCountValue = payload.confirmedFootCount;
    const confirmedFootCount =
      confirmedFootCountValue === null || confirmedFootCountValue === undefined
        ? null
        : confirmedFootCountValue;
    if (
      confirmedFootCount !== null &&
      (typeof confirmedFootCount !== "number" ||
        !Number.isInteger(confirmedFootCount) ||
        confirmedFootCount < 0)
    ) {
      return malformed("DECK_CONFIRMED_COUNT_INVALID");
    }

    const errorCode = nullableString(payload.errorCode);
    const messageId = nullableString(payload.messageId);
    if (errorCode === undefined || messageId === undefined) {
      return malformed("DECK_METADATA_INVALID");
    }

    return {
      ok: true,
      value: {
        footDetectionStatus: footDetectionStatus as FootDetectionStatus,
        riderStatus: riderStatus as RiderStatus,
        pressureValues,
        detectedPressureRegions,
        estimatedFootPositions,
        confirmedFootCount,
        errorCode,
        messageId,
      },
    };
  }
}
