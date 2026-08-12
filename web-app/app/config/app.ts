export const APP_NAME = "";
export const APP_DISPLAY_NAME = APP_NAME || "앱 이름";
export const SAFETY_STABLE_DURATION_MS = 2_500;

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
} as const;
