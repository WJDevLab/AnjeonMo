"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { SensorService } from "@/app/services/sensor/contracts";
import {
  EMPTY_SENSOR_SNAPSHOT,
  type SensorSnapshot,
} from "@/app/types/sensor";

const EMPTY_SUBSCRIBE = (): (() => void) => () => undefined;
const GET_EMPTY_SNAPSHOT = (): SensorSnapshot => EMPTY_SENSOR_SNAPSHOT;

export interface UseSensorDataResult {
  snapshot: SensorSnapshot;
  mode: "real" | "test";
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * The UI consumes only the common snapshot. Passing null keeps every value in a
 * fail-closed, unknown state.
 */
export function useSensorData(
  service: SensorService | null,
): UseSensorDataResult {
  const snapshot = useSyncExternalStore(
    service ? service.subscribe : EMPTY_SUBSCRIBE,
    service ? service.getSnapshot : GET_EMPTY_SNAPSHOT,
    GET_EMPTY_SNAPSHOT,
  );

  const connect = useCallback(
    async () => {
      if (service) await service.connect();
    },
    [service],
  );

  const disconnect = useCallback(
    async () => {
      if (service) await service.disconnect();
    },
    [service],
  );

  return {
    snapshot,
    mode: service?.mode ?? "real",
    connect,
    disconnect,
  };
}
