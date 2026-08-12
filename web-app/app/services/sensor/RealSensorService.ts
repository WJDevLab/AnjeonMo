import { DeckDataAdapter } from "./DeckDataAdapter";
import { HelmetDataAdapter } from "./HelmetDataAdapter";
import { SensorCoordinator } from "./SensorCoordinator";
import type { SensorService, Unsubscribe } from "./contracts";
import type { RealSensorConfig } from "./config";
import { readPublicSensorConfig } from "./config";
import { WebBluetoothHelmetTransport } from "./WebBluetoothHelmetTransport";
import { WebSocketDeckTransport } from "./WebSocketDeckTransport";

export class RealSensorService implements SensorService {
  readonly mode = "real" as const;
  private readonly coordinator: SensorCoordinator;

  constructor(config: RealSensorConfig) {
    this.coordinator = new SensorCoordinator(
      new WebBluetoothHelmetTransport(config.helmet),
      new WebSocketDeckTransport(config.deck),
      new HelmetDataAdapter(),
      new DeckDataAdapter(),
      config.freshness,
    );
  }

  getSnapshot = () => this.coordinator.getSnapshot();

  subscribe = (listener: () => void): Unsubscribe =>
    this.coordinator.subscribe(listener);

  connect(): Promise<void> {
    return this.coordinator.connect();
  }

  disconnect(): Promise<void> {
    return this.coordinator.disconnect();
  }

  dispose(): void {
    this.coordinator.dispose();
  }
}

export function createRealSensorServiceFromEnv(): RealSensorService {
  return new RealSensorService(readPublicSensorConfig());
}
