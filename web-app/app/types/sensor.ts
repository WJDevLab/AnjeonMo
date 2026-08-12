export type ConnectionStatus =
  | "unknown"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type HelmetStatus =
  | "unknown"
  | "checking"
  | "worn"
  | "notWorn"
  | "sensorUnavailable"
  | "stale"
  | "error";

export type FootDetectionStatus =
  | "unknown"
  | "checking"
  | "normal"
  | "multiplePressureRegions"
  | "multipleRiderSuspected"
  | "positionInvalid"
  | "sensorUnavailable"
  | "stale"
  | "error";

export type OverallSafetyStatus =
  | "idle"
  | "connecting"
  | "checking"
  | "attentionRequired"
  | "success"
  | "riding"
  | "error";

export type RiderStatus =
  | "unknown"
  | "singleRider"
  | "multipleRiderSuspected";

export type FootRole = "left" | "right" | "unknown";

/**
 * Positions are normalized to the one-dimensional length of the deck.
 * Sensor numbers are never rendered directly by the UI.
 */
export interface PressureRegion {
  id: string;
  startRatio: number;
  endRatio: number;
  intensityRatio: number | null;
}

export interface FootPosition {
  id: string;
  longitudinalRatio: number;
  role: FootRole;
  intensityRatio: number | null;
}

export type SensorIssueSource =
  | "helmetBluetooth"
  | "deckWifi"
  | "coordinator";

export type SensorIssueCategory =
  | "connection"
  | "stale"
  | "malformed"
  | "sensor"
  | "configuration";

export interface SensorIssue {
  source: SensorIssueSource;
  category: SensorIssueCategory;
  code: string;
}

export interface SensorSnapshot {
  connectionStatus: ConnectionStatus;
  helmetConnectionStatus: ConnectionStatus;
  deckConnectionStatus: ConnectionStatus;

  helmetStatus: HelmetStatus;
  footDetectionStatus: FootDetectionStatus;
  riderStatus: RiderStatus;

  /** null means unavailable; an empty array means a valid message contained no values. */
  pressureValues: readonly number[] | null;
  detectedPressureRegions: readonly PressureRegion[] | null;
  estimatedFootPositions: readonly FootPosition[] | null;
  /** Used only when the upstream processor explicitly guarantees a count. */
  confirmedFootCount: number | null;

  safetyStatus: OverallSafetyStatus;
  issues: readonly SensorIssue[];

  /** App receipt timestamps, not device clocks. */
  helmetReceivedAt: string | null;
  deckReceivedAt: string | null;
  receivedAt: string | null;
}

export const EMPTY_SENSOR_SNAPSHOT: Readonly<SensorSnapshot> = Object.freeze({
  connectionStatus: "unknown",
  helmetConnectionStatus: "unknown",
  deckConnectionStatus: "unknown",
  helmetStatus: "unknown",
  footDetectionStatus: "unknown",
  riderStatus: "unknown",
  pressureValues: null,
  detectedPressureRegions: null,
  estimatedFootPositions: null,
  confirmedFootCount: null,
  safetyStatus: "idle",
  issues: Object.freeze([]) as readonly SensorIssue[],
  helmetReceivedAt: null,
  deckReceivedAt: null,
  receivedAt: null,
});
