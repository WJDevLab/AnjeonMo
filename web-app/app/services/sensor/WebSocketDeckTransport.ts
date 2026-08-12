import type { ConnectionStatus } from "@/app/types/sensor";

import type {
  SensorConnectionEvent,
  SensorSourceService,
  Unsubscribe,
} from "./contracts";
import { SensorTransportError } from "./SensorTransportError";

export interface WebSocketDeckTransportConfig {
  url: string | null;
}

/** Receives deck messages over Wi-Fi through a WebSocket endpoint or gateway. */
export class WebSocketDeckTransport implements SensorSourceService<unknown> {
  private readonly dataListeners = new Set<(payload: unknown) => void>();
  private readonly connectionListeners = new Set<
    (event: SensorConnectionEvent) => void
  >();
  private status: ConnectionStatus = "unknown";
  private socket: WebSocket | null = null;
  private intentionallyClosed = false;

  constructor(private readonly config: WebSocketDeckTransportConfig) {}

  getConnectionStatus(): ConnectionStatus {
    return this.status;
  }

  subscribeData(listener: (payload: unknown) => void): Unsubscribe {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  subscribeConnection(
    listener: (event: SensorConnectionEvent) => void,
  ): Unsubscribe {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  connect(): Promise<void> {
    if (
      typeof WebSocket !== "undefined" &&
      this.socket?.readyState === WebSocket.OPEN
    ) {
      return Promise.resolve();
    }

    const { url } = this.config;
    if (!url) {
      this.emitConnection("error", "DECK_WEBSOCKET_URL_MISSING");
      return Promise.reject(
        new SensorTransportError(
          "DECK_WEBSOCKET_URL_MISSING",
          "A deck WebSocket URL is required.",
        ),
      );
    }
    if (typeof WebSocket === "undefined") {
      this.emitConnection("error", "DECK_WEBSOCKET_UNSUPPORTED");
      return Promise.reject(
        new SensorTransportError(
          "DECK_WEBSOCKET_UNSUPPORTED",
          "WebSocket is unavailable in this runtime.",
        ),
      );
    }

    this.intentionallyClosed = false;
    this.emitConnection("connecting", null);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(url);
      socket.binaryType = "arraybuffer";
      this.socket = socket;

      socket.onopen = () => {
        settled = true;
        this.emitConnection("connected", null);
        resolve();
      };
      socket.onmessage = (event: MessageEvent<unknown>) => {
        for (const listener of this.dataListeners) listener(event.data);
      };
      socket.onerror = () => {
        this.emitConnection("error", "DECK_WEBSOCKET_CONNECTION_FAILED");
        if (!settled) {
          settled = true;
          reject(
            new SensorTransportError(
              "DECK_WEBSOCKET_CONNECTION_FAILED",
              "The deck WebSocket connection failed.",
            ),
          );
        }
      };
      socket.onclose = () => {
        this.socket = null;
        if (this.intentionallyClosed) {
          this.emitConnection("disconnected", null);
        } else if (this.status !== "error") {
          this.emitConnection("disconnected", "DECK_WEBSOCKET_CLOSED");
        }
        if (!settled) {
          settled = true;
          reject(
            new SensorTransportError(
              "DECK_WEBSOCKET_CLOSED",
              "The deck WebSocket closed before it connected.",
            ),
          );
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    this.intentionallyClosed = true;
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    this.emitConnection("disconnected", null);
  }

  private emitConnection(
    status: ConnectionStatus,
    errorCode: string | null,
  ): void {
    this.status = status;
    const event = { status, errorCode } satisfies SensorConnectionEvent;
    for (const listener of this.connectionListeners) listener(event);
  }
}
