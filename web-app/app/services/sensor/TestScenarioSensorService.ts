import {
  EMPTY_SENSOR_SNAPSHOT,
  type ConnectionStatus,
  type FootDetectionStatus,
  type HelmetStatus,
  type OverallSafetyStatus,
  type RiderStatus,
  type SensorSnapshot,
} from "@/app/types/sensor";

import type { SensorService, Unsubscribe } from "./contracts";

function aggregate(
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

function scenarioSafety(snapshot: SensorSnapshot): OverallSafetyStatus {
  if (
    snapshot.connectionStatus === "unknown" ||
    snapshot.connectionStatus === "connecting"
  ) {
    return "connecting";
  }
  if (
    snapshot.connectionStatus === "error" ||
    snapshot.connectionStatus === "disconnected" ||
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

/**
 * Test-only symbolic state source. It never invents pressure, position, ride,
 * price, distance, battery, or statistics numbers. It cannot be instantiated
 * accidentally without an explicit `enabled: true` opt-in.
 */
export class TestScenarioSensorService implements SensorService {
  readonly mode = "test" as const;
  private snapshot: SensorSnapshot = { ...EMPTY_SENSOR_SNAPSHOT };
  private readonly listeners = new Set<() => void>();

  constructor(options: { enabled: true }) {
    if (options.enabled !== true) {
      throw new Error("Test scenario sensor service is disabled.");
    }
  }

  getSnapshot = (): SensorSnapshot => this.snapshot;

  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async connect(): Promise<void> {
    this.publish({
      helmetConnectionStatus: "connecting",
      deckConnectionStatus: "connecting",
    });
  }

  async disconnect(): Promise<void> {
    this.publish({
      helmetConnectionStatus: "disconnected",
      deckConnectionStatus: "disconnected",
      helmetStatus: "sensorUnavailable",
      footDetectionStatus: "sensorUnavailable",
    });
  }

  setConnections(
    helmetConnectionStatus: ConnectionStatus,
    deckConnectionStatus: ConnectionStatus,
  ): void {
    this.publish({ helmetConnectionStatus, deckConnectionStatus });
  }

  setHelmetStatus(helmetStatus: HelmetStatus): void {
    const receivedAt = new Date().toISOString();
    this.publish({ helmetStatus, helmetReceivedAt: receivedAt, receivedAt });
  }

  setFootDetectionStatus(
    footDetectionStatus: FootDetectionStatus,
    riderStatus: RiderStatus = "unknown",
  ): void {
    const receivedAt = new Date().toISOString();
    this.publish({
      footDetectionStatus,
      riderStatus,
      pressureValues: null,
      detectedPressureRegions: null,
      estimatedFootPositions: null,
      confirmedFootCount: null,
      deckReceivedAt: receivedAt,
      receivedAt,
    });
  }

  heartbeat(source: "helmet" | "deck"): void {
    const receivedAt = new Date().toISOString();
    this.publish(
      source === "helmet"
        ? { helmetReceivedAt: receivedAt, receivedAt }
        : { deckReceivedAt: receivedAt, receivedAt },
    );
  }

  markRiding(): void {
    this.snapshot = { ...this.snapshot, safetyStatus: "riding" };
    this.emit();
  }

  protected publish(patch: Partial<SensorSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    next.connectionStatus = aggregate(
      next.helmetConnectionStatus,
      next.deckConnectionStatus,
    );
    next.safetyStatus = scenarioSafety(next);
    this.snapshot = next;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
