import type { ScooterDetails } from "@/app/types/domain";

export interface MockScooterListItem extends ScooterDetails {
  distanceFromUserM: number;
}

/**
 * Prototype-only stand-in for a nearby-scooter API. Values are placeholders
 * for demoing the flow end to end, not real fleet data.
 */
const MOCK_SCOOTERS: readonly MockScooterListItem[] = [
  {
    id: "SM-2041",
    modelName: "안전母 라이트 2세대",
    batteryPercent: 82,
    estimatedRangeKm: 24,
    baseFareAmount: 1000,
    perMinuteFareAmount: 150,
    currencyCode: "KRW",
    distanceFromUserM: 68,
  },
  {
    id: "SM-1198",
    modelName: "안전母 스탠다드",
    batteryPercent: 47,
    estimatedRangeKm: 12,
    baseFareAmount: 800,
    perMinuteFareAmount: 130,
    currencyCode: "KRW",
    distanceFromUserM: 145,
  },
  {
    id: "SM-3390",
    modelName: "안전母 라이트 2세대",
    batteryPercent: 95,
    estimatedRangeKm: 29,
    baseFareAmount: 1000,
    perMinuteFareAmount: 150,
    currencyCode: "KRW",
    distanceFromUserM: 210,
  },
  {
    id: "SM-0765",
    modelName: "안전母 프로",
    batteryPercent: 18,
    estimatedRangeKm: 4,
    baseFareAmount: 1200,
    perMinuteFareAmount: 180,
    currencyCode: "KRW",
    distanceFromUserM: 340,
  },
];

export function listMockScooters(): readonly MockScooterListItem[] {
  return MOCK_SCOOTERS;
}

export function findMockScooterById(id: string): MockScooterListItem | null {
  return MOCK_SCOOTERS.find((scooter) => scooter.id === id) ?? null;
}
