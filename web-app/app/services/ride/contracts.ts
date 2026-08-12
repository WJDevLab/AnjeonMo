import type { RideTelemetry } from "@/app/types/ride";

export type RideUnsubscribe = () => void;

export type RideAdapterResult =
  | { ok: true; value: RideTelemetry }
  | { ok: false; errorCode: string };

export interface RideTelemetryAdapterContract {
  adapt(raw: unknown, receivedAt: string): RideAdapterResult;
}

export interface RideTelemetryService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(listener: () => void): RideUnsubscribe;
  getSnapshot(): RideTelemetry;
}
