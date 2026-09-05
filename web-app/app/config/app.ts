export const APP_NAME = "";
export const APP_DISPLAY_NAME = APP_NAME || "앱 이름";

export const ROUTES = {
  welcome: "/",
  home: "/home",
  scooters: "/scooters",
  scooterDetail: "/scooter",
  safetyCheck: "/safety-check",
  riding: "/riding",
  history: "/history",
  payment: "/payment",
  profile: "/profile",
  statistics: "/statistics",
  friends: "/friends",
  friendDetail: "/friends/:friendId",
} as const;
