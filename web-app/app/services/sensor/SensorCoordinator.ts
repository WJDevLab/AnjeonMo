import {
  EMPTY_SENSOR_SNAPSHOT,
  type ConnectionStatus,
  type FootDetectionStatus,
  type HelmetStatus,
  type OverallSafetyStatus,
  type SensorIssue,
  type SensorIssueCategory,
  type SensorIssueSource,
  type SensorSnapshot,
} from "@/app/types/sensor";

import type {
  Clock,
  DeckReading,
  HelmetReading,
  SensorConnectionEvent,
  SensorDataAdapter,
  SensorService,
  SensorSourceService,
  Unsubscribe,
} from "./contracts";
import { SYSTEM_CLOCK } from "./contracts";

export interface SensorCoordinatorConfig {
  helmetStaleAfterMs: number | null;
  deckStaleAfterMs: number | null;
}

function aggregateConnectionStatus(
  helmet: ConnectionStatus,
  deck: ConnectionStatus,
): ConnectionStatus {
  if (helmet === "error" || deck === "error") return "error";
  if (helmet === "connecting" || deck === "connecting") return "connecting";
  if (helmet === "disconnected" || deck === "disconnected") {
    return "disconnected";
  }
  if (helmet === "connected" && deck === "connected") return "connected";
  return "unknown";
}

function deriveSafetyStatus(
  snapshot: SensorSnapshot,
  connectAttempted: boolean,
): OverallSafetyStatus {
  if (!connectAttempted) return "idle";

  if (
    snapshot.helmetConnectionStatus === "connecting" ||
    snapshot.deckConnectionStatus === "connecting" ||
    snapshot.helmetConnectionStatus === "unknown" ||
    snapshot.deckConnectionStatus === "unknown"
  ) {
    return "connecting";
  }

  if (
    snapshot.connectionStatus === "error" ||
    snapshot.connectionStatus === "disconnected" ||
    snapshot.issues.length > 0 ||
    ["sensorUnavailable", "stale", "error"].includes(
      snapshot.helmetStatus,
    ) ||
    ["sensorUnavailable", "stale", "error"].includes(
      snapshot.footDetectionStatus,
    )
  ) {
    return "error";
  }

  if (
    snapshot.helmetStatus === "notWorn" ||
    [
      "multiplePressureRegions",
      "multipleRiderSuspected",
      "positionInvalid",
    ].includes(snapshot.footDetectionStatus)
  ) {
    return "attentionRequired";
  }

  return "checking";
}

/** Merges two transports, validates data, and owns independent stale timers. */
export class SensorCoordinator implements SensorService {
  readonly mode = "real" as const;

  private snapshot: SensorSnapshot = { ...EMPTY_SENSOR_SNAPSHOT };
  private readonly listeners = new Set<() => void>();
  private readonly sourceUnsubscribers: Unsubscribe[];
  private connectAttempted = false;
  private helmetLastReceivedMonotonicMs: number | null = null;
  private deckLastReceivedMonotonicMs: number | null = null;
  private helmetStaleTimer: ReturnType<typeof setTimeout> | null = null;
  private deckStaleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly helmetSource: SensorSourceService<unknown>,
    private readonly deckSource: SensorSourceService<unknown>,
    private readonly helmetAdapter: SensorDataAdapter<unknown, HelmetReading>,
    private readonly deckAdapter: SensorDataAdapter<unknown, DeckReading>,
    private readonly config: SensorCoordinatorConfig,
    private readonly clock: Clock = SYSTEM_CLOCK,
  ) {
    this.sourceUnsubscribers = [
      helmetSource.subscribeConnection(this.handleHelmetConnection),
      deckSource.subscribeConnection(this.handleDeckConnection),
      helmetSource.subscribeData(this.handleHelmetData),
      deckSource.subscribeData(this.handleDeckData),
    ];
  }

  getSnapshot = (): SensorSnapshot => this.snapshot;

  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async connect(): Promise<void> {
    this.connectAttempted = true;
    this.publish({ safetyStatus: "connecting" });

    if (!this.isValidStaleThreshold(this.config.helmetStaleAfterMs)) {
      this.setIssue({
        source: "helmetBluetooth",
        category: "configuration",
        code: "HELMET_STALE_POLICY_MISSING",
      });
    }
    if (!this.isValidStaleThreshold(this.config.deckStaleAfterMs)) {
      this.setIssue({
        source: "deckWifi",
        category: "configuration",
        code: "DECK_STALE_POLICY_MISSING",
      });
    }

    await Promise.allSettled([
      this.helmetSource.connect(),
      this.deckSource.connect(),
    ]);
    this.recalculateAndEmit();
  }

  async disconnect(): Promise<void> {
    this.clearStaleTimers();
    await Promise.allSettled([
      this.helmetSource.disconnect(),
      this.deckSource.disconnect(),
    ]);
    this.recalculateAndEmit();
  }

  /** Permanently releases subscriptions when the service instance is discarded. */
  dispose(): void {
    this.clearStaleTimers();
    for (const unsubscribe of this.sourceUnsubscribers) unsubscribe();
    this.listeners.clear();
  }

  private readonly handleHelmetConnection = (
    event: SensorConnectionEvent,
  ): void => {
    this.replaceIssueCategory("helmetBluetooth", "connection", null);

    let helmetStatus: HelmetStatus = this.snapshot.helmetStatus;
    if (event.status === "connecting" || event.status === "connected") {
      if (this.snapshot.helmetReceivedAt === null) helmetStatus = "checking";
    } else if (event.status === "unknown") {
      helmetStatus = "unknown";
    } else {
      helmetStatus = "sensorUnavailable";
      this.cancelHelmetStaleTimer();
    }

    if (event.errorCode) {
      this.setIssue({
        source: "helmetBluetooth",
        category: "connection",
        code: event.errorCode,
      });
    }

    this.publish({
      helmetConnectionStatus: event.status,
      helmetStatus,
    });
  };

  private readonly handleDeckConnection = (
    event: SensorConnectionEvent,
  ): void => {
    this.replaceIssueCategory("deckWifi", "connection", null);

    let footDetectionStatus: FootDetectionStatus =
      this.snapshot.footDetectionStatus;
    if (event.status === "connecting" || event.status === "connected") {
      if (this.snapshot.deckReceivedAt === null) footDetectionStatus = "checking";
    } else if (event.status === "unknown") {
      footDetectionStatus = "unknown";
    } else {
      footDetectionStatus = "sensorUnavailable";
      this.cancelDeckStaleTimer();
    }

    if (event.errorCode) {
      this.setIssue({
        source: "deckWifi",
        category: "connection",
        code: event.errorCode,
      });
    }

    this.publish({
      deckConnectionStatus: event.status,
      footDetectionStatus,
    });
  };

  private readonly handleHelmetData = (raw: unknown): void => {
    const receivedAt = this.clock.nowIso();
    this.helmetLastReceivedMonotonicMs = this.clock.nowMonotonicMs();
    const result = this.helmetAdapter.adapt(raw);

    this.replaceIssueCategory("helmetBluetooth", "malformed", null);
    this.replaceIssueCategory("helmetBluetooth", "stale", null);
    this.replaceIssueCategory("helmetBluetooth", "sensor", null);

    if (!result.ok) {
      this.setIssue(result.issue);
      this.publish({
        helmetStatus: "error",
        helmetReceivedAt: receivedAt,
        receivedAt,
      });
      return;
    }

    if (result.value.errorCode) {
      this.setIssue({
        source: "helmetBluetooth",
        category: "sensor",
        code: result.value.errorCode,
      });
    } else if (
      result.value.helmetStatus === "sensorUnavailable" ||
      result.value.helmetStatus === "error"
    ) {
      this.setIssue({
        source: "helmetBluetooth",
        category: "sensor",
        code: "HELMET_SENSOR_UNAVAILABLE",
      });
    }

    this.scheduleHelmetStaleCheck();
    this.publish({
      helmetStatus: result.value.helmetStatus,
      helmetReceivedAt: receivedAt,
      receivedAt,
    });
  };

  private readonly handleDeckData = (raw: unknown): void => {
    const receivedAt = this.clock.nowIso();
    this.deckLastReceivedMonotonicMs = this.clock.nowMonotonicMs();
    const result = this.deckAdapter.adapt(raw);

    this.replaceIssueCategory("deckWifi", "malformed", null);
    this.replaceIssueCategory("deckWifi", "stale", null);
    this.replaceIssueCategory("deckWifi", "sensor", null);

    if (!result.ok) {
      this.setIssue(result.issue);
      this.publish({
        footDetectionStatus: "error",
        riderStatus: "unknown",
        pressureValues: null,
        detectedPressureRegions: null,
        estimatedFootPositions: null,
        confirmedFootCount: null,
        deckReceivedAt: receivedAt,
        receivedAt,
      });
      return;
    }

    if (result.value.errorCode) {
      this.setIssue({
        source: "deckWifi",
        category: "sensor",
        code: result.value.errorCode,
      });
    } else if (
      result.value.footDetectionStatus === "sensorUnavailable" ||
      result.value.footDetectionStatus === "error"
    ) {
      this.setIssue({
        source: "deckWifi",
        category: "sensor",
        code: "DECK_SENSOR_UNAVAILABLE",
      });
    }

    this.scheduleDeckStaleCheck();
    this.publish({
      footDetectionStatus: result.value.footDetectionStatus,
      riderStatus: result.value.riderStatus,
      pressureValues: result.value.pressureValues,
      detectedPressureRegions: result.value.detectedPressureRegions,
      estimatedFootPositions: result.value.estimatedFootPositions,
      confirmedFootCount: result.value.confirmedFootCount,
      deckReceivedAt: receivedAt,
      receivedAt,
    });
  };

  private scheduleHelmetStaleCheck(): void {
    this.cancelHelmetStaleTimer();
    const threshold = this.config.helmetStaleAfterMs;
    if (!this.isValidStaleThreshold(threshold)) return;
    const expectedReceipt = this.helmetLastReceivedMonotonicMs;
    this.helmetStaleTimer = setTimeout(() => {
      if (this.helmetLastReceivedMonotonicMs !== expectedReceipt) return;
      this.setIssue({
        source: "helmetBluetooth",
        category: "stale",
        code: "HELMET_DATA_STALE",
      });
      this.publish({ helmetStatus: "stale" });
    }, threshold);
  }

  private scheduleDeckStaleCheck(): void {
    this.cancelDeckStaleTimer();
    const threshold = this.config.deckStaleAfterMs;
    if (!this.isValidStaleThreshold(threshold)) return;
    const expectedReceipt = this.deckLastReceivedMonotonicMs;
    this.deckStaleTimer = setTimeout(() => {
      if (this.deckLastReceivedMonotonicMs !== expectedReceipt) return;
      this.setIssue({
        source: "deckWifi",
        category: "stale",
        code: "DECK_DATA_STALE",
      });
      this.publish({ footDetectionStatus: "stale" });
    }, threshold);
  }

  private publish(patch: Partial<SensorSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    next.connectionStatus = aggregateConnectionStatus(
      next.helmetConnectionStatus,
      next.deckConnectionStatus,
    );
    next.safetyStatus = deriveSafetyStatus(next, this.connectAttempted);
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private recalculateAndEmit(): void {
    this.publish({});
  }

  private setIssue(issue: SensorIssue): void {
    const withoutSameIssue = this.snapshot.issues.filter(
      (candidate) =>
        !(
          candidate.source === issue.source &&
          candidate.category === issue.category &&
          candidate.code === issue.code
        ),
    );
    this.snapshot = {
      ...this.snapshot,
      issues: [...withoutSameIssue, issue],
    };
  }

  private replaceIssueCategory(
    source: SensorIssueSource,
    category: SensorIssueCategory,
    issue: SensorIssue | null,
  ): void {
    const remaining = this.snapshot.issues.filter(
      (candidate) =>
        candidate.source !== source || candidate.category !== category,
    );
    this.snapshot = {
      ...this.snapshot,
      issues: issue ? [...remaining, issue] : remaining,
    };
  }

  private isValidStaleThreshold(value: number | null): value is number {
    return value !== null && Number.isFinite(value) && value > 0;
  }

  private cancelHelmetStaleTimer(): void {
    if (this.helmetStaleTimer) clearTimeout(this.helmetStaleTimer);
    this.helmetStaleTimer = null;
  }

  private cancelDeckStaleTimer(): void {
    if (this.deckStaleTimer) clearTimeout(this.deckStaleTimer);
    this.deckStaleTimer = null;
  }

  private clearStaleTimers(): void {
    this.cancelHelmetStaleTimer();
    this.cancelDeckStaleTimer();
  }
}
