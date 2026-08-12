"use client";

import { useSyncExternalStore } from "react";
import type { RideTelemetryService } from "../services/ride";
import { EMPTY_RIDE_TELEMETRY, type RideTelemetry } from "../types/ride";

const emptySubscribe = () => () => undefined;
const getEmptySnapshot = (): RideTelemetry => EMPTY_RIDE_TELEMETRY;

export function useRideTelemetry(service: RideTelemetryService | null): RideTelemetry {
  return useSyncExternalStore(
    service ? service.subscribe : emptySubscribe,
    service ? service.getSnapshot : getEmptySnapshot,
    getEmptySnapshot,
  );
}
