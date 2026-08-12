import type { SensorCoordinatorConfig } from "./SensorCoordinator";
import type { WebBluetoothHelmetTransportConfig } from "./WebBluetoothHelmetTransport";
import type { WebSocketDeckTransportConfig } from "./WebSocketDeckTransport";

export interface RealSensorConfig {
  helmet: WebBluetoothHelmetTransportConfig;
  deck: WebSocketDeckTransportConfig;
  freshness: SensorCoordinatorConfig;
}

function nullable(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function positiveMilliseconds(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Both NEXT_PUBLIC_* and VITE_* names are supported for the current Vite-based
 * runtime. Missing values intentionally remain null and therefore fail closed.
 */
export function readPublicSensorConfig(): RealSensorConfig {
  return {
    helmet: {
      serviceUuid: nullable(
        process.env.NEXT_PUBLIC_HELMET_BLE_SERVICE_UUID ??
          process.env.VITE_HELMET_BLE_SERVICE_UUID,
      ),
      characteristicUuid: nullable(
        process.env.NEXT_PUBLIC_HELMET_BLE_CHARACTERISTIC_UUID ??
          process.env.VITE_HELMET_BLE_CHARACTERISTIC_UUID,
      ),
    },
    deck: {
      url: nullable(
        process.env.NEXT_PUBLIC_DECK_WS_URL ?? process.env.VITE_DECK_WS_URL,
      ),
    },
    freshness: {
      helmetStaleAfterMs: positiveMilliseconds(
        process.env.NEXT_PUBLIC_HELMET_STALE_AFTER_MS ??
          process.env.VITE_HELMET_STALE_AFTER_MS,
      ),
      deckStaleAfterMs: positiveMilliseconds(
        process.env.NEXT_PUBLIC_DECK_STALE_AFTER_MS ??
          process.env.VITE_DECK_STALE_AFTER_MS,
      ),
    },
  };
}
