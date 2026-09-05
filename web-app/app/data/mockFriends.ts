import { daysAgo, toDateKey } from "@/app/utils/date";

export interface FriendRideRecord {
  id: string;
  dateKey: string;
  distanceKm: number;
  durationSeconds: number;
  fareAmount: number;
  currencyCode: string;
  multiRiderBlockedCount: number;
  helmetBlockedCount: number;
}

export interface MockFriend {
  id: string;
  name: string;
  relationship: string;
  isRidingNow: boolean;
  lastRideAt: string | null;
  rides: readonly FriendRideRecord[];
}

type RideSeed = readonly [daysAgoCount: number, distanceKm: number, minutes: number, fare: number, multi: number, helmet: number];

function buildRides(seeds: readonly RideSeed[], prefix: string): FriendRideRecord[] {
  return seeds.map(([daysAgoCount, distanceKm, minutes, fare, multi, helmet], index) => ({
    id: `${prefix}-${index}`,
    dateKey: toDateKey(daysAgo(daysAgoCount)),
    distanceKm,
    durationSeconds: minutes * 60,
    fareAmount: fare,
    currencyCode: "KRW",
    multiRiderBlockedCount: multi,
    helmetBlockedCount: helmet,
  }));
}

/**
 * Prototype-only stand-in for a guardian/friend backend. "친구" has no
 * backend in this repo yet — these values only exist to demo the screen.
 */
const MOCK_FRIENDS: readonly MockFriend[] = [
  {
    id: "f-minjun",
    name: "김민준",
    relationship: "아들",
    isRidingNow: true,
    lastRideAt: new Date().toISOString(),
    rides: buildRides(
      [
        [0, 2.1, 9, 1900, 1, 0],
        [2, 3.4, 15, 2900, 0, 1],
        [5, 1.8, 8, 1650, 0, 0],
        [11, 4.0, 17, 3400, 1, 1],
      ],
      "minjun",
    ),
  },
  {
    id: "f-seoyeon",
    name: "박서연",
    relationship: "친구",
    isRidingNow: false,
    lastRideAt: daysAgo(1).toISOString(),
    rides: buildRides(
      [
        [1, 2.7, 12, 2300, 0, 0],
        [4, 3.1, 14, 2700, 0, 0],
        [8, 1.4, 7, 1500, 0, 0],
      ],
      "seoyeon",
    ),
  },
  {
    id: "f-doyun",
    name: "이도윤",
    relationship: "친구",
    isRidingNow: false,
    lastRideAt: daysAgo(6).toISOString(),
    rides: buildRides(
      [
        [6, 5.2, 22, 4200, 2, 0],
        [13, 3.6, 16, 3100, 0, 1],
      ],
      "doyun",
    ),
  },
  {
    id: "f-hana",
    name: "최하나",
    relationship: "사촌",
    isRidingNow: false,
    lastRideAt: null,
    rides: [],
  },
];

export function listMockFriends(): readonly MockFriend[] {
  return MOCK_FRIENDS;
}

export function findMockFriendById(id: string): MockFriend | null {
  return MOCK_FRIENDS.find((friend) => friend.id === id) ?? null;
}
