export type BatteryState = "healthy" | "mid" | "replace" | "unknown";
export type OnlineState = "online" | "offline";
export type TimeRange = "24h" | "7d" | "30d" | "3m";

export interface SparklinePoint {
  ts: string;
  y: number; // water_level_in
}

export interface GaugeSummary {
  id: number;
  device_id: number;
  name: string;
  town_state: string | null;
  last_updated_at: string | null;
  minutes_ago: number | null;
  battery_state: BatteryState;
  online_state: OnlineState;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
  sparkline: SparklinePoint[];
}

export interface RangeOption {
  value: TimeRange;
  label: string;       // pill label
  xLabel: string;      // under-chart label
  dropdownLabel: string;
}

export const RANGE_OPTIONS: RangeOption[] = [
  { value: "24h", label: "Last 24h",      xLabel: "Time - Last 24h",      dropdownLabel: "Last 24 hours"  },
  { value: "7d",  label: "Last 7 days",   xLabel: "Time - Last 7 days",   dropdownLabel: "Last 7 days"    },
  { value: "30d", label: "Last 30 days",  xLabel: "Time - Last 30 days",  dropdownLabel: "Last 30 days"   },
  { value: "3m",  label: "Last 3 months", xLabel: "Time - Last 3 months", dropdownLabel: "Last 3 months"  },
];

// ── Alert subscriptions ────────────────────────────────────────────────────
export type AlertCondition = "above" | "below";
export type AlertChannel   = "email" | "sms";

export interface AlertSubscribePayload {
  gauge_id:     number;
  condition:    AlertCondition;
  threshold_in: number;
  channel:      AlertChannel;
  contact:      string;
}

export interface AlertSubscribeResponse {
  id:           number;
  token:        string;
  gauge_id:     number;
  condition:    AlertCondition;
  threshold_in: number;
  channel:      AlertChannel;
  contact:      string; // masked
}

export interface LocalAlertRule {
  token:           string;
  gauge_id:        number;
  gauge_name:      string;
  condition:       AlertCondition;
  threshold_in:    number;
  channel:         AlertChannel;
  contact_masked:  string;
  active:          boolean; // local-only toggle
}
