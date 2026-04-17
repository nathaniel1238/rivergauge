"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import type { GaugeSummary } from "@/types";

const GaugeMap = dynamic(() => import("@/components/GaugeMap"), { ssr: false });

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MapPage() {
  const { data: gauges, isLoading } = useSWR<GaugeSummary[]>(
    "/api/dashboard?range=24h",
    fetcher,
    { refreshInterval: 15_000 }
  );

  const pinCount = gauges?.filter((g) => g.latitude != null).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gauge Map</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? "Loading..." : `${pinCount} gauge${pinCount !== 1 ? "s" : ""} on map`}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b6cf5] inline-block" />
            Healthy battery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" />
            Mid battery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block" />
            Replace battery
          </span>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
        style={{ height: "calc(100vh - 180px)", minHeight: 420 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center bg-gray-50 text-gray-400 text-sm" style={{ height: "100%" }}>
            Loading map...
          </div>
        ) : (
          <GaugeMap gauges={gauges ?? []} />
        )}
      </div>
    </div>
  );
}
