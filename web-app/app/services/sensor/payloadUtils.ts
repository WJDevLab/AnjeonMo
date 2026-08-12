export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBytes(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

export function parseRecord(raw: unknown): UnknownRecord | null {
  if (isRecord(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  if (raw instanceof DataView) {
    const bytes = new Uint8Array(
      raw.buffer,
      raw.byteOffset,
      raw.byteLength,
    );
    const parsed = decodeBytes(bytes);
    return isRecord(parsed) ? parsed : null;
  }

  if (raw instanceof ArrayBuffer) {
    const parsed = decodeBytes(new Uint8Array(raw));
    return isRecord(parsed) ? parsed : null;
  }

  return null;
}

export function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

export function finiteNumberArray(
  value: unknown,
): readonly number[] | null | undefined {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return undefined;
  return value.every((item) => typeof item === "number" && Number.isFinite(item))
    ? value
    : undefined;
}

export function isUnitRatio(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}
