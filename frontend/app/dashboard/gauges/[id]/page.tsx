"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import dynamic from "next/dynamic";
import BatteryChip from "@/components/BatteryChip";
import StatusPill from "@/components/StatusPill";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import { timeAgo } from "@/lib/api";
import { RANGE_OPTIONS, type TimeRange } from "@/types";
import type { GaugeSummary } from "@/types";
import { loadSettings, type Units, type Timezone } from "@/lib/settings";

const DetailChart = dynamic(() => import("@/components/DetailChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-xl skeleton flex items-center justify-center">
      <span className="text-xs text-gray-400">Loading chart…</span>
    </div>
  ),
});

interface Reading { ts: string; water_level_in: number; }

const fetcher = (url: string) =>
  fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({
  label, value, unit, icon, delay = 0,
}: {
  label: string; value: string | null; unit: string;
  icon: React.ReactNode; delay?: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-card px-5 py-4 flex items-start gap-3.5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
        {value != null ? (
          <p className="text-[22px] font-semibold text-gray-900 tracking-tight leading-none tabular">
            {value}
            <span className="text-[13px] font-normal text-gray-400 ml-1.5">{unit}</span>
          </p>
        ) : (
          <div className="h-6 w-20 rounded skeleton" />
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function GaugeDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [range,       setRange]       = useState<TimeRange>("24h");
  const [units,       setUnits]       = useState<Units>("imperial");
  const [timezone,    setTimezone]    = useState<Timezone>("America/New_York");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const s = loadSettings();
    setRange(s.defaultRange);
    setUnits(s.units);
    setTimezone(s.timezone);
    setAutoRefresh(s.autoRefresh);
  }, []);

  const isMetric   = units === "metric";
  const unitLabel  = isMetric ? "cm" : "in";
  const rangeOption = RANGE_OPTIONS.find((o) => o.value === range) ?? RANGE_OPTIONS[0];

  const { data: gauge, error: gaugeErr } = useSWR<GaugeSummary>(`/api/gauges/${id}`, fetcher);
  const { data: readings, isLoading: readingsLoading } = useSWR<Reading[]>(
    `/api/gauges/${id}/readings?range=${range}&limit=1000`,
    fetcher,
    { refreshInterval: autoRefresh ? 5_000 : 0, revalidateOnFocus: false }
  );

  const values  = readings?.map((r) => r.water_level_in) ?? [];
  const current = values.at(-1) ?? null;
  const high    = values.length ? Math.max(...values) : null;
  const low     = values.length ? Math.min(...values) : null;

  const fmt = (v: number | null) =>
    v != null ? (isMetric ? (v * 2.54).toFixed(2) : v.toFixed(2)) : null;

  if (gaugeErr) {
    return (
      <div className="max-w-5xl rounded-2xl bg-red-50 border border-red-100 p-10 text-center animate-fade-in">
        <p className="text-[13px] font-medium text-red-600 mb-2">Gauge not found</p>
        <Link href="/dashboard" className="text-sm text-red-500 hover:text-red-700 underline transition-colors">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 page-enter">
      {/* ── Breadcrumb ───────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-[12.5px]">
        <Link href="/dashboard" className="text-gray-400 hover:text-[#3b6cf5] transition-colors">
          Gauges
        </Link>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate max-w-xs">
          {gauge?.name ?? <span className="inline-block h-3.5 w-32 rounded skeleton align-middle" />}
        </span>
      </nav>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {gauge ? (
          <div className="animate-fade-in-up">
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight leading-tight">
              {gauge.name}
            </h1>
            <p className="text-[12.5px] text-gray-400 mt-1">
              {gauge.town_state}
              {gauge.last_updated_at && (
                <>
                  <span className="mx-1.5 text-gray-300">·</span>
                  Updated {timeAgo(gauge.last_updated_at)}
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-6 w-56 rounded-lg skeleton" />
            <div className="h-3.5 w-40 rounded skeleton" />
          </div>
        )}

        {gauge ? (
          <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "80ms" }}>
            <BatteryChip state={gauge.battery_state} />
            <StatusPill state={gauge.online_state} />
          </div>
        ) : (
          <div className="h-7 w-40 rounded-full skeleton" />
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Current"
          value={fmt(current)}
          unit={unitLabel}
          delay={60}
          icon={
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label={`${rangeOption.dropdownLabel} high`}
          value={fmt(high)}
          unit={unitLabel}
          delay={110}
          icon={
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          }
        />
        <StatCard
          label={`${rangeOption.dropdownLabel} low`}
          value={fmt(low)}
          unit={unitLabel}
          delay={160}
          icon={
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          }
        />
      </div>

      {/* ── Chart card ───────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[13.5px] font-semibold text-gray-800">Water Level</h2>
            <p className="text-[11.5px] text-gray-400 mt-0.5">{rangeOption.xLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {readings && (
              <span className="text-[11.5px] text-gray-400 tabular animate-fade-in">
                {readings.length} readings
              </span>
            )}
            <TimeRangeDropdown value={range} onChange={setRange} />
          </div>
        </div>

        {readingsLoading && !readings ? (
          <div className="h-[260px] sm:h-[420px] rounded-xl skeleton flex items-center justify-center">
            <span className="text-[11px] text-gray-400">Loading…</span>
          </div>
        ) : !readings?.length ? (
          <div className="h-[260px] sm:h-[420px] rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-[12px] text-gray-400">No readings in {rangeOption.dropdownLabel.toLowerCase()}</p>
          </div>
        ) : (
          <DetailChart data={readings} range={range} units={units} timezone={timezone} height="clamp(260px, 45vh, 420px)" />
        )}
      </div>
    </div>
  );
}
