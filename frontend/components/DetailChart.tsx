"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TimeRange } from "@/types";
import type { Units, Timezone } from "@/lib/settings";

export interface DataPoint {
  ts: string;
  water_level_in: number;
}

export interface PinnedPoint {
  ts: number;
  value: number;
}

interface Props {
  data: DataPoint[];
  range: TimeRange;
  units?: Units;
  timezone?: Timezone;
  height?: number;
}

function fmtAxisLabel(ts: number, range: TimeRange, timezone: Timezone): string {
  const d = new Date(ts);
  if (range === "24h") {
    return d.toLocaleString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone,
    });
  }
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: timezone });
}

export function fmtTooltipTime(epochMs: number, timezone: Timezone = "America/New_York"): string {
  return new Date(epochMs).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: true, timeZone: timezone, timeZoneName: "short",
  });
}

function nearest(pts: [number, number][], ts: number): [number, number] | null {
  if (!pts.length) return null;
  return pts.reduce((p, c) => Math.abs(c[0] - ts) < Math.abs(p[0] - ts) ? c : p);
}

export default function DetailChart({
  data,
  range,
  units    = "imperial",
  timezone = "America/New_York",
  height   = 420,
}: Props) {
  const isMetric  = units === "metric";
  const unitLabel = isMetric ? "cm" : "in";
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef       = useRef<any>(null);
  const seriesDataRef  = useRef<[number, number][]>([]);
  const [pinned, setPinned] = useState<PinnedPoint | null>(null);

  const buildOption = useCallback(
    (seriesData: [number, number][], pin: PinnedPoint | null) => ({
      animation: false,
      grid: { top: 20, right: 24, bottom: 48, left: 56 },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { lineStyle: { color: "#e2e8f0" }, length: 3 },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 11,
          hideOverlap: true,
          margin: 10,
          formatter: (v: number) => fmtAxisLabel(v, range, timezone),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#9ca3af",
          fontSize: 11,
          formatter: (v: number) => `${v.toFixed(1)} ${unitLabel}`,
          margin: 8,
        },
        splitLine: { show: true, lineStyle: { color: "#e2e8f0", width: 1 } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: "box-shadow:0 6px 20px rgba(0,0,0,0.09);border-radius:12px;",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#d1d5db", width: 1, type: "solid" },
          label: { show: false },
        },
        formatter: (params: { value: [number, number] }[]) => {
          if (!params?.length) return "";
          const [ts, val] = params[0].value;
          return `
            <div style="font-size:10.5px;color:#9ca3af;margin-bottom:4px;letter-spacing:0.01em">${fmtTooltipTime(ts, timezone)}</div>
            <div style="font-size:17px;font-weight:650;color:#111827;letter-spacing:-0.5px;line-height:1.1">
              ${val.toFixed(2)}<span style="font-size:12px;font-weight:500;color:#6b7280;margin-left:2px">${unitLabel}</span>
            </div>
          `;
        },
      },
      dataZoom: [{ type: "inside", filterMode: "none" }],
      series: [
        {
          type: "line",
          data: seriesData,
          smooth: 0.35,
          symbol: "circle",
          symbolSize: 0,
          showSymbol: false,
          sampling: "lttb",
          lineStyle: { color: "#3b6cf5", width: 2 },
          markLine: pin
            ? {
                silent: true,
                symbol: ["none", "none"],
                animation: false,
                data: [{ xAxis: pin.ts }],
                lineStyle: { color: "#3b6cf5", type: "dashed", width: 1.5 },
                label: { show: false },
              }
            : undefined,
          markPoint: pin
            ? {
                animation: false,
                data: [{ coord: [pin.ts, pin.value] }],
                symbol: "circle",
                symbolSize: 8,
                itemStyle: { color: "#3b6cf5", borderColor: "#fff", borderWidth: 2.5 },
                label: { show: false },
              }
            : undefined,
        },
      ],
    }),
    [range]
  );

  // Init
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const echarts = await import("echarts");
      if (cancelled || !containerRef.current) return;
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

      const sd: [number, number][] = data.map((d) => [new Date(d.ts).getTime(), isMetric ? d.water_level_in * 2.54 : d.water_level_in]);
      seriesDataRef.current = sd;
      chartRef.current.setOption(buildOption(sd, null));

      chartRef.current.getZr().on("click", (e: { offsetX: number; offsetY: number }) => {
        const px = [e.offsetX, e.offsetY];
        if (!chartRef.current?.containPixel("grid", px)) return;
        const [x] = chartRef.current.convertFromPixel("grid", px);
        const pt  = nearest(seriesDataRef.current, x);
        if (!pt) return;
        const newPin = { ts: pt[0], value: pt[1] };
        setPinned(newPin);
        chartRef.current.setOption(buildOption(seriesDataRef.current, newPin));
      });
    })();

    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update on data/range change
  useEffect(() => {
    if (!chartRef.current) return;
    const sd: [number, number][] = data.map((d) => [new Date(d.ts).getTime(), isMetric ? d.water_level_in * 2.54 : d.water_level_in]);
    seriesDataRef.current = sd;
    setPinned(null);
    chartRef.current.setOption(buildOption(sd, null), true);
  }, [data, buildOption]);

  const dismissPin = () => {
    setPinned(null);
    chartRef.current?.setOption(buildOption(seriesDataRef.current, null), true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Pinned banner */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
          pinned
            ? "opacity-100 bg-blue-50 border-blue-100"
            : "opacity-0 pointer-events-none bg-transparent border-transparent"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        {pinned && (
          <>
            <span className="text-[11.5px] text-blue-600 font-medium">{fmtTooltipTime(pinned.ts)}</span>
            <span className="text-[11px] text-blue-300 mx-0.5">—</span>
            <span className="text-sm font-semibold text-blue-900 tabular">
              {pinned.value.toFixed(2)}
              <span className="text-blue-500 font-normal ml-0.5 text-xs"> {unitLabel}</span>
            </span>
          </>
        )}
        <button
          onClick={dismissPin}
          className="ml-auto p-1 -mr-1 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
          aria-label="Dismiss pin"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="relative">
        <div
          className="absolute text-[9.5px] text-gray-400 select-none"
          style={{
            writingMode: "vertical-lr",
            transform: "rotate(180deg)",
            left: 0,
            top: "50%",
            translate: "0 -50%",
          }}
        >
          Water Level ({unitLabel})
        </div>
        <div ref={containerRef} style={{ height, width: "100%" }} />
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] text-gray-300 tabular -mt-1 select-none">
        Click the chart to pin a reading&nbsp;&nbsp;·&nbsp;&nbsp;Scroll to zoom
      </p>
    </div>
  );
}
