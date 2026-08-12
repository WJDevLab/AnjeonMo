import {
  EMPTY_RIDE_TELEMETRY,
  type RideTelemetry,
} from "@/app/types/ride";

import type {
  RideTelemetryAdapterContract,
  RideTelemetryService,
  RideUnsubscribe,
} from "./contracts";
import { RideTelemetryAdapter } from "./RideTelemetryAdapter";

export interface WebSocketRideTelemetryConfig {
  url: string | null;
}

/** Optional production stream for distance, time, and fare from a gateway. */
export class WebSocketRideTelemetryService
  implements RideTelemetryService
{
  private snapshot: RideTelemetry = { ...EMPTY_RIDE_TELEMETRY };
  private readonly listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private intentionallyClosed = false;

  constructor(
    private readonly config: WebSocketRideTelemetryConfig,
    private readonly adapter: RideTelemetryAdapterContract =
      new RideTelemetryAdapter(),
  ) {}

  getSnapshot = (): RideTelemetry => this.snapshot;

  subscribe = (listener: () => void): RideUnsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  connect(): Promise<void> {
    if (
      typeof WebSocket !== "undefined" &&
      this.socket?.readyState === WebSocket.OPEN
    ) {
      return Promise.resolve();
    }
    if (!this.config.url) {
      this.publishError("RIDE_WEBSOCKET_URL_MISSING");
      return Promise.reject(new Error("Ride WebSocket URL is missing."));
    }
    if (typeof WebSocket === "undefined") {
      this.publishError("RIDE_WEBSOCKET_UNSUPPORTED");
      return Promise.reject(new Error("WebSocket is unavailable."));
    }

    this.intentionallyClosed = false;
    this.snapshot = { ...this.snapshot, status: "starting", errorCode: null };
    this.emit();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(this.config.url as string);
      socket.binaryType = "arraybuffer";
      this.socket = socket;

      socket.onopen = () => {
        settled = true;
        resolve();
      };
      socket.onmessage = (event: MessageEvent<unknown>) => {
        const receivedAt = new Date().toISOString();
        const result = this.adapter.adapt(event.data, receivedAt);
        if (!result.ok) {
          this.publishError(result.errorCode);
          return;
        }
        this.snapshot = result.value;
        this.emit();
      };
      socket.onerror = () => {
        this.publishError("RIDE_WEBSOCKET_CONNECTION_FAILED");
        if (!settled) {
          settled = true;
          reject(new Error("Ride WebSocket connection failed."));
        }
      };
      socket.onclose = () => {
        this.socket = null;
        if (!this.intentionallyClosed) {
          this.publishError("RIDE_WEBSOCKET_CLOSED");
        }
        if (!settled) {
          settled = true;
          reject(new Error("Ride WebSocket closed before connecting."));
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    this.intentionallyClosed = true;
    const socket = this.socket;
    this.socket = null;
    if (
      socket &&
      typeof WebSocket !== "undefined" &&
      socket.readyState !== WebSocket.CLOSED
    ) {
      socket.close();
    }
  }

  private publishError(errorCode: string): void {
    this.snapshot = {
      ...this.snapshot,
      status: "error",
      errorCode,
      receivedAt: new Date().toISOString(),
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function readPublicRideTelemetryUrl(): string | null {
  const value =
    process.env.NEXT_PUBLIC_RIDE_WS_URL ?? process.env.VITE_RIDE_WS_URL;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
