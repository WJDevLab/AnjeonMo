import type { ConnectionStatus } from "@/app/types/sensor";

import type {
  SensorConnectionEvent,
  SensorSourceService,
  Unsubscribe,
} from "./contracts";
import { SensorTransportError } from "./SensorTransportError";

interface BluetoothCharacteristicLike extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothCharacteristicLike>;
  stopNotifications?(): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothServerLike {
  connected: boolean;
  connect(): Promise<BluetoothServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
}

interface BluetoothDeviceLike extends EventTarget {
  gatt?: BluetoothServerLike;
}

interface BluetoothNavigatorLike {
  requestDevice(options: {
    filters: Array<{ services: string[] }>;
    optionalServices?: string[];
  }): Promise<BluetoothDeviceLike>;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: BluetoothNavigatorLike;
}

export interface WebBluetoothHelmetTransportConfig {
  serviceUuid: string | null;
  characteristicUuid: string | null;
}

/**
 * Handles browser Bluetooth permissions and notifications only. It deliberately
 * does not understand the sensor payload format.
 */
export class WebBluetoothHelmetTransport
  implements SensorSourceService<unknown>
{
  private readonly dataListeners = new Set<(payload: unknown) => void>();
  private readonly connectionListeners = new Set<
    (event: SensorConnectionEvent) => void
  >();
  private status: ConnectionStatus = "unknown";
  private device: BluetoothDeviceLike | null = null;
  private characteristic: BluetoothCharacteristicLike | null = null;

  constructor(private readonly config: WebBluetoothHelmetTransportConfig) {}

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

  async connect(): Promise<void> {
    if (this.status === "connected") return;

    const { serviceUuid, characteristicUuid } = this.config;
    if (!serviceUuid || !characteristicUuid) {
      this.emitConnection("error", "HELMET_BLUETOOTH_CONFIG_MISSING");
      throw new SensorTransportError(
        "HELMET_BLUETOOTH_CONFIG_MISSING",
        "Bluetooth service and characteristic UUIDs are required.",
      );
    }

    const bluetooth =
      typeof navigator === "undefined"
        ? undefined
        : (navigator as NavigatorWithBluetooth).bluetooth;
    if (!bluetooth) {
      this.emitConnection("error", "HELMET_BLUETOOTH_UNSUPPORTED");
      throw new SensorTransportError(
        "HELMET_BLUETOOTH_UNSUPPORTED",
        "Web Bluetooth is unavailable in this browser context.",
      );
    }

    this.emitConnection("connecting", null);
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: [serviceUuid] }],
        optionalServices: [serviceUuid],
      });
      if (!device.gatt) {
        throw new SensorTransportError(
          "HELMET_GATT_UNAVAILABLE",
          "The selected helmet does not expose a GATT server.",
        );
      }

      this.device = device;
      device.addEventListener("gattserverdisconnected", this.handleDisconnect);
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(characteristicUuid);
      this.characteristic = await characteristic.startNotifications();
      this.characteristic.addEventListener(
        "characteristicvaluechanged",
        this.handleValue,
      );
      this.emitConnection("connected", null);
    } catch (error) {
      const code =
        error instanceof SensorTransportError
          ? error.code
          : "HELMET_BLUETOOTH_CONNECTION_FAILED";
      this.emitConnection("error", code);
      await this.clearResources();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.clearResources();
    this.emitConnection("disconnected", null);
  }

  private readonly handleValue = (event: Event): void => {
    const characteristic = event.target as BluetoothCharacteristicLike | null;
    const value = characteristic?.value;
    if (!value) return;

    const copiedValue = new DataView(
      value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength,
      ),
    );
    for (const listener of this.dataListeners) listener(copiedValue);
  };

  private readonly handleDisconnect = (): void => {
    this.characteristic = null;
    this.emitConnection("disconnected", "HELMET_BLUETOOTH_DISCONNECTED");
  };

  private async clearResources(): Promise<void> {
    if (this.characteristic) {
      this.characteristic.removeEventListener(
        "characteristicvaluechanged",
        this.handleValue,
      );
      try {
        await this.characteristic.stopNotifications?.();
      } catch {
        // The transport is already closing; connection state still fails closed.
      }
    }

    if (this.device) {
      this.device.removeEventListener(
        "gattserverdisconnected",
        this.handleDisconnect,
      );
      if (this.device.gatt?.connected) this.device.gatt.disconnect();
    }
    this.characteristic = null;
    this.device = null;
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
