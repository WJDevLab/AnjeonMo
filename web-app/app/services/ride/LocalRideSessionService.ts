import {
  EMPTY_RIDE_TELEMETRY,
  type RideTelemetry,
} from "@/app/types/ride";

import type {
  RideTelemetryService,
  RideUnsubscribe,
} from "./contracts";

export interface ActualRideTelemetryPatch {
  rideId?: string | null;
  distanceKm?: number | null;
  fareAmount?: number | null;
  currencyCode?: string | null;
  errorCode?: string | null;
}

/**
 * Provides a real elapsed clock after the application receives a confirmed
 * ride start. Distance and fare stay null until an actual integration updates
 * them through `applyActualTelemetry`.
 */
export class LocalRideSessionService implements RideTelemetryService {
  private snapshot: RideTelemetry = { ...EMPTY_RIDE_TELEMETRY };
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAtEpochMs: number | null = null;

  getSnapshot = (): RideTelemetry => this.snapshot;

  subscribe = (listener: () => void): RideUnsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async connect(): Promise<void> {
    // A local confirmed session has no network connection of its own.
  }

  async disconnect(): Promise<void> {
    this.clearTimer();
  }

  confirmStarted(rideId: string | null = null): void {
    this.startedAtEpochMs = Date.now();
    const startedAt = new Date(this.startedAtEpochMs).toISOString();
    this.snapshot = {
      status: "riding",
      rideId,
      startedAt,
      distanceKm: null,
      elapsedSeconds: 0,
      fareAmount: null,
      currencyCode: null,
      receivedAt: startedAt,
      errorCode: null,
    };
    this.emit();
    this.startTimer();
  }

  applyActualTelemetry(patch: ActualRideTelemetryPatch): void {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      receivedAt: new Date().toISOString(),
    };
    this.emit();
  }

  endConfirmedRide(): void {
    this.updateElapsed();
    this.clearTimer();
    this.snapshot = {
      ...this.snapshot,
      status: "ended",
      receivedAt: new Date().toISOString(),
    };
    this.emit();
  }

  private startTimer(): void {
    this.clearTimer();
    this.timer = setInterval(() => this.updateElapsed(), 1_000);
  }

  private updateElapsed(): void {
    if (this.startedAtEpochMs === null) return;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - this.startedAtEpochMs) / 1_000),
    );
    if (elapsedSeconds === this.snapshot.elapsedSeconds) return;
    this.snapshot = { ...this.snapshot, elapsedSeconds };
    this.emit();
  }

  private clearTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
