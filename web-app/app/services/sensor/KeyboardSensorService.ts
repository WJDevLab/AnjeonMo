import type { FootPosition } from "@/app/types/sensor";
import { TestScenarioSensorService } from "./TestScenarioSensorService";

const ONE_FOOT: readonly FootPosition[] = [{ id: "foot-a", longitudinalRatio: 0.56, role: "unknown", intensityRatio: 0.7 }];

const TWO_FEET: readonly FootPosition[] = [
  { id: "foot-left", longitudinalRatio: 0.58, role: "left", intensityRatio: 0.85 },
  { id: "foot-right", longitudinalRatio: 0.58, role: "right", intensityRatio: 0.85 },
];

const THREE_FEET: readonly FootPosition[] = [
  { id: "foot-left", longitudinalRatio: 0.62, role: "left", intensityRatio: 0.85 },
  { id: "foot-right", longitudinalRatio: 0.62, role: "right", intensityRatio: 0.85 },
  { id: "foot-extra", longitudinalRatio: 0.32, role: "unknown", intensityRatio: 0.6 },
];

/**
 * No pressure-sensor or helmet hardware exists yet (see repo README notice),
 * so this stands in for it: number keys drive the same enum snapshot a real
 * deck/helmet transport would produce. `connect()` auto-advances to
 * `connected` so the safety-check screen doesn't stall on a manual step.
 */
export class KeyboardSensorService extends TestScenarioSensorService {
  async connect(): Promise<void> {
    this.setConnections("connecting", "connecting");
    await new Promise((resolve) => setTimeout(resolve, 450));
    this.setConnections("connected", "connected");
  }

  /** key "1" = one foot, "2" = two feet (normal), "3" = three or more feet. */
  pressFootKey(key: "1" | "2" | "3"): void {
    const receivedAt = new Date().toISOString();
    const base = {
      pressureValues: null,
      detectedPressureRegions: null,
      deckReceivedAt: receivedAt,
      receivedAt,
    };
    if (key === "1") {
      this.publish({
        ...base,
        footDetectionStatus: "checking",
        riderStatus: "unknown",
        estimatedFootPositions: ONE_FOOT,
        confirmedFootCount: null,
      });
      return;
    }
    if (key === "2") {
      this.publish({
        ...base,
        footDetectionStatus: "normal",
        riderStatus: "singleRider",
        estimatedFootPositions: TWO_FEET,
        confirmedFootCount: 2,
      });
      return;
    }
    this.publish({
      ...base,
      footDetectionStatus: "multipleRiderSuspected",
      riderStatus: "multipleRiderSuspected",
      estimatedFootPositions: THREE_FEET,
      confirmedFootCount: null,
    });
  }

  /** key "4" = helmet worn. */
  pressHelmetKey(): void {
    this.setHelmetStatus("worn");
  }
}
