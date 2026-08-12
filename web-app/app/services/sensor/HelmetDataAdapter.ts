import type { HelmetStatus, SensorIssue } from "@/app/types/sensor";

import type {
  AdapterResult,
  HelmetReading,
  SensorDataAdapter,
} from "./contracts";
import { nullableString, parseRecord } from "./payloadUtils";

const HELMET_STATUSES = new Set<HelmetStatus>([
  "unknown",
  "checking",
  "worn",
  "notWorn",
  "sensorUnavailable",
  "error",
]);

function malformed(code: string): AdapterResult<never> {
  const issue: SensorIssue = {
    source: "helmetBluetooth",
    category: "malformed",
    code,
  };
  return { ok: false, issue };
}

/**
 * Default contract: a JSON object (or UTF-8 JSON BLE value) containing
 * `helmetStatus`, with optional nullable `errorCode` and `messageId`.
 * A binary hardware format can be supported by replacing only this adapter.
 */
export class HelmetDataAdapter
  implements SensorDataAdapter<unknown, HelmetReading>
{
  adapt(raw: unknown): AdapterResult<HelmetReading> {
    const payload = parseRecord(raw);
    if (!payload) return malformed("HELMET_PAYLOAD_INVALID");

    const helmetStatus = payload.helmetStatus;
    if (
      typeof helmetStatus !== "string" ||
      !HELMET_STATUSES.has(helmetStatus as HelmetStatus)
    ) {
      return malformed("HELMET_STATUS_INVALID");
    }

    const errorCode = nullableString(payload.errorCode);
    const messageId = nullableString(payload.messageId);
    if (errorCode === undefined || messageId === undefined) {
      return malformed("HELMET_METADATA_INVALID");
    }

    return {
      ok: true,
      value: {
        helmetStatus: helmetStatus as HelmetStatus,
        errorCode,
        messageId,
      },
    };
  }
}
