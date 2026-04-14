"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import BatteryChip from "./BatteryChip";
import StatusPill from "./StatusPill";
import { timeAgo } from "@/lib/api";
import type { GaugeSummary, RangeOption } from "@/types";
import type { Units } from "@/lib/settings";

const SparklineChart = dynamic(() => import("./SparklineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[112px] rounded-lg skeleton" />
  ),
});

interface Props {
  gauge: GaugeSummary;
  rangeOption: RangeOption;
  units?: Units;
  index?: number;
}

export default function GaugeCard({ gauge, rangeOption, units = "imperial", index = 0 }: Props) {
  const isMetric     = units === "metric";
  const yLabel       = isMetric ? "Water Level (cm)" : "Water Level (in)";
  const sparkline    = isMetric
    ? gauge.sparkline.map((p) => ({ ...p, y: p.y * 2.54 }))
    : gauge.sparkline;
  return (
    <Link
      href={`/dashboard/gauges/${gauge.id}`}
      className="block group animate-fade-in-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <article
        className={`
          bg-white rounded-2xl border p-5 flex flex-col gap-3 min-h-[224px]
          transition-all duration-200 ease-out cursor-pointer
          shadow-card group-hover:shadow-card-hover group-hover:border-gray-200
          group-hover:-translate-y-[2px]
          ${gauge.battery_state === "replace" ? "border-red-100" : "border-gray-100"}
        `}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[13.5px] font-semibold text-gray-900 leading-snug">
            {gauge.name}
          </h2>
          <BatteryChip state={gauge.battery_state} />
        </div>

        {/* ── Meta ────────────────────────────────────────────────── */}
        <p className="text-[11.5px] text-gray-400 -mt-1.5 leading-none">
          {gauge.town_state}
          {gauge.last_updated_at && (
            <>
              <span className="mx-1.5 text-gray-300">·</span>
              Updated {timeAgo(gauge.last_updated_at)}
            </>
          )}
        </p>

        {/* ── Chart area ──────────────────────────────────────────── */}
        <div className="flex items-stretch gap-1 flex-1 min-h-0">
          {/* Y-label */}
          <div className="hidden sm:flex items-center justify-center w-4 flex-shrink-0">
            <span
              className="text-[9px] text-gray-300 whitespace-nowrap select-none"
              style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
            >
              {yLabel}
            </span>
          </div>

          {/* Chart */}
          <div className="flex-1 min-w-0">
            {sparkline.length > 0 ? (
              <SparklineChart data={sparkline} height={112} />
            ) : (
              <div className="h-[112px] flex items-center justify-center rounded-lg bg-gray-50 text-[11px] text-gray-300">
                No data
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="flex-1 text-center text-[10.5px] text-gray-300 tabular">
            {rangeOption.xLabel}
          </span>
          <StatusPill state={gauge.online_state} />
        </div>
      </article>
    </Link>
  );
}
