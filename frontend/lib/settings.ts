import type { TimeRange } from "@/types";

export type Units    = "imperial" | "metric";
export type Timezone =
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "UTC";

export interface AppSettings {
  defaultRange: TimeRange;
  autoRefresh:  boolean;
  units:        Units;
  timezone:     Timezone;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  defaultRange: "24h",
  autoRefresh:  true,
  units:        "imperial",
  timezone:     "America/New_York",
};

const KEY = "river_gauge_settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...SETTINGS_DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — fail silently
  }
}
