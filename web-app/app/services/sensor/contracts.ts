import type {
  ConnectionStatus,
  FootDetectionStatus,
  FootPosition,
  HelmetStatus,
  PressureRegion,
  RiderStatus,
  SensorIssue,
  SensorSnapshot,
} from "@/app/types/sensor";

export type Unsubscribe = () => void;

export interface SensorConnectionEvent {
  status: ConnectionStatus;
  errorCode: string | null;
}

export interface SensorSourceService<TRaw> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribeData(listener: (payload: TRaw) => void): Unsubscribe;
  subscribeConnection(
    listener: (event: SensorConnectionEvent) => void,
  ): Unsubscribe;
  getConnectionStatus(): ConnectionStatus;
}

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; issue: SensorIssue };

export interface SensorDataAdapter<TRaw, TNormalized> {
  adapt(raw: TRaw): AdapterResult<TNormalized>;
}

export interface HelmetReading {
  helmetStatus: HelmetStatus;
  errorCode: string | null;
  messageId: string | null;
}

export interface DeckReading {
  footDetectionStatus: FootDetectionStatus;
  riderStatus: RiderStatus;
  pressureValues: readonly number[] | null;
  detectedPressureRegions: readonly PressureRegion[] | null;
  estimatedFootPositions: readonly FootPosition[] | null;
  confirmedFootCount: number | null;
  errorCode: string | null;
  messageId: string | null;
}

export interface SensorService {
  readonly mode: "real" | "test";
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(listener: () => void): Unsubscribe;
  getSnapshot(): SensorSnapshot;
}

export interface Clock {
  nowIso(): string;
  nowMonotonicMs(): number;
}

export const SYSTEM_CLOCK: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMonotonicMs: () =>
    typeof performance === "undefined" ? Date.now() : performance.now(),
};
