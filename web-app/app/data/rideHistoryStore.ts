import { daysAgo, toDateKey } from "@/app/utils/date";

export interface RideRecord {
  id: string;
  dateKey: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  durationSeconds: number;
  fareAmount: number;
  currencyCode: string;
  multiRiderBlockedCount: number;
  helmetBlockedCount: number;
}

export interface MonthlyAggregate {
  rideCount: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number | null;
  averageSpeedKph: number | null;
  safetyPassCount: number;
  helmetConfirmedCount: number;
  multipleRiderSuspectedCount: number;
  safetyBlockedCount: number;
  dailyDistanceKm: readonly { dateKey: string; distanceKm: number }[];
  recentRides: readonly RideRecord[];
}

const STORAGE_KEY = "anjeonmo.rideHistory.v1";

type SeedSpec = readonly [daysAgoCount: number, distanceKm: number, minutes: number, fare: number, multi: number, helmet: number];

const SEED_SPECS: readonly SeedSpec[] = [
  [1, 2.4, 11, 2650, 0, 0],
  [3, 4.1, 18, 3700, 1, 0],
  [3, 1.2, 6, 1900, 0, 1],
  [6, 3.6, 15, 3250, 0, 0],
  [9, 5.3, 24, 4600, 0, 0],
  [14, 2.8, 13, 2950, 1, 0],
  [20, 6.1, 27, 5050, 0, 1],
  [27, 3.0, 14, 3100, 0, 0],
  [34, 4.4, 19, 3850, 0, 0],
];

function buildSeedRecords(): RideRecord[] {
  return SEED_SPECS.map(([daysAgoCount, distanceKm, minutes, fare, multi, helmet], index) => {
    const started = daysAgo(daysAgoCount);
    started.setHours(9 + ((index * 3) % 10), (index * 17) % 60, 0, 0);
    const ended = new Date(started.getTime() + minutes * 60_000);
    return {
      id: `seed-${index}`,
      dateKey: toDateKey(started),
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      distanceKm,
      durationSeconds: minutes * 60,
      fareAmount: fare,
      currencyCode: "KRW",
      multiRiderBlockedCount: multi,
      helmetBlockedCount: helmet,
    };
  });
}

function readAll(): RideRecord[] {
  if (typeof window === "undefined") return buildSeedRecords();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedAndPersist();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedAndPersist();
    return parsed as RideRecord[];
  } catch {
    return seedAndPersist();
  }
}

function writeAll(records: readonly RideRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage unavailable (private mode, quota). The session still works from memory.
  }
}

function seedAndPersist(): RideRecord[] {
  const seeded = buildSeedRecords();
  writeAll(seeded);
  return seeded;
}

export function getAllRideRecords(): RideRecord[] {
  return readAll()
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getRideRecordsByDate(dateKey: string): RideRecord[] {
  return getAllRideRecords().filter((record) => record.dateKey === dateKey);
}

export function getRideRecordsByMonth(year: number, month: number): RideRecord[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return getAllRideRecords().filter((record) => record.dateKey.startsWith(prefix));
}

export function addRideRecord(input: Omit<RideRecord, "id" | "dateKey">): RideRecord {
  const record: RideRecord = {
    ...input,
    id: `ride-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    dateKey: toDateKey(new Date(input.startedAt)),
  };
  const all = readAll();
  all.push(record);
  writeAll(all);
  return record;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getMonthlyAggregate(year: number, month: number): MonthlyAggregate {
  return aggregateRecords(getRideRecordsByMonth(year, month));
}

export function getOverallAggregate(): MonthlyAggregate {
  return aggregateRecords(getAllRideRecords());
}

function aggregateRecords(records: readonly RideRecord[]): MonthlyAggregate {
  const rideCount = records.length;
  const totalDistanceKm = round2(records.reduce((sum, r) => sum + r.distanceKm, 0));
  const totalDurationSeconds = records.reduce((sum, r) => sum + r.durationSeconds, 0);
  const totalMultiBlocked = records.reduce((sum, r) => sum + r.multiRiderBlockedCount, 0);
  const totalHelmetBlocked = records.reduce((sum, r) => sum + r.helmetBlockedCount, 0);
  const averageDurationSeconds = rideCount === 0 ? null : Math.round(totalDurationSeconds / rideCount);
  const averageSpeedKph = totalDurationSeconds === 0 ? null : round1(totalDistanceKm / (totalDurationSeconds / 3600));

  const byDate = new Map<string, number>();
  for (const record of records) {
    byDate.set(record.dateKey, round2((byDate.get(record.dateKey) ?? 0) + record.distanceKm));
  }
  const dailyDistanceKm = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, distanceKm]) => ({ dateKey, distanceKm }));

  return {
    rideCount,
    totalDistanceKm,
    totalDurationSeconds,
    averageDurationSeconds,
    averageSpeedKph,
    safetyPassCount: rideCount,
    helmetConfirmedCount: rideCount,
    multipleRiderSuspectedCount: totalMultiBlocked,
    safetyBlockedCount: totalMultiBlocked + totalHelmetBlocked,
    dailyDistanceKm,
    recentRides: records.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5),
  };
}
