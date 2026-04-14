"use client";

import { useEffect, useState } from "react";
import {
  loadSettings,
  saveSettings,
  SETTINGS_DEFAULTS,
  type AppSettings,
} from "@/lib/settings";

/* ── Section wrapper ────────────────────────────────────────────────────── */
function Section({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="text-[13.5px] font-semibold text-gray-800">{title}</h2>
        {description && (
          <p className="text-[11.5px] text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

/* ── Setting row ────────────────────────────────────────────────────────── */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-800">{label}</p>
        {description && (
          <p className="text-[11.5px] text-gray-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ height: "20px", width: "36px" }}
      className={`relative rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b6cf5] ${
        checked ? "bg-[#3b6cf5]" : "bg-gray-200"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── Select ─────────────────────────────────────────────────────────────── */
function Select({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[12.5px] text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3b6cf5] focus:ring-2 focus:ring-[#3b6cf5]/10 transition-all shadow-sm cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(SETTINGS_DEFAULTS);
  const [hydrated,   setHydrated]   = useState(false);
  const [backendOk,  setBackendOk]  = useState<boolean | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration to avoid overwriting with defaults)
  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  // Check backend health
  useEffect(() => {
    fetch("/health")
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-2xl page-enter space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight leading-tight">
          Settings
        </h1>
        <p className="text-[12.5px] text-gray-400 mt-0.5">
          Dashboard preferences — saved locally in your browser
        </p>
      </div>

      {/* Display */}
      <Section title="Display" description="Chart and dashboard appearance" delay={0}>
        <SettingRow
          label="Default time range"
          description="Used when opening the dashboard or a gauge page"
        >
          <Select
            value={settings.defaultRange}
            onChange={(v) => update("defaultRange", v as AppSettings["defaultRange"])}
            options={[
              { value: "24h", label: "Last 24 hours" },
              { value: "7d",  label: "Last 7 days"   },
              { value: "30d", label: "Last 30 days"  },
              { value: "3m",  label: "Last 3 months" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Units"
          description="Measurement units for water level display"
        >
          <Select
            value={settings.units}
            onChange={(v) => update("units", v as AppSettings["units"])}
            options={[
              { value: "imperial", label: "Imperial (in)" },
              { value: "metric",   label: "Metric (cm)"   },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Time zone"
          description="Used for chart axis labels and tooltips"
        >
          <Select
            value={settings.timezone}
            onChange={(v) => update("timezone", v as AppSettings["timezone"])}
            options={[
              { value: "America/New_York",    label: "Eastern (ET)"  },
              { value: "America/Chicago",     label: "Central (CT)"  },
              { value: "America/Denver",      label: "Mountain (MT)" },
              { value: "America/Los_Angeles", label: "Pacific (PT)"  },
              { value: "UTC",                 label: "UTC"           },
            ]}
          />
        </SettingRow>
      </Section>

      {/* Data */}
      <Section title="Data" description="Polling and refresh behavior" delay={60}>
        <SettingRow
          label="Auto-refresh"
          description="Automatically reload gauge data every 30 seconds"
        >
          <Toggle
            checked={settings.autoRefresh}
            onChange={(v) => update("autoRefresh", v)}
          />
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About" delay={120}>
        <SettingRow label="Version" description="River Gauge Dashboard">
          <span className="text-[12px] text-gray-400 tabular font-mono">v0.1.0</span>
        </SettingRow>

        <SettingRow label="Backend" description="FastAPI data ingestion server">
          {backendOk === null ? (
            <span className="text-[12px] text-gray-400">Checking…</span>
          ) : backendOk ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-green-600">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-green-500" />
              </span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-red-500">
              <span className="h-[7px] w-[7px] rounded-full bg-red-400 inline-block" />
              Unreachable
            </span>
          )}
        </SettingRow>
      </Section>
    </div>
  );
}
