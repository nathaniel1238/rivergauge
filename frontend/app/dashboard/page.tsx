"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import GaugeCard from "@/components/GaugeCard";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import { RANGE_OPTIONS, type TimeRange } from "@/types";
import type { GaugeSummary } from "@/types";
import { loadSettings, type Units } from "@/lib/settings";

const PAGE_SIZE = 6;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<GaugeSummary[]>;
  });

/* ── Shimmer skeleton card ─────────────────────────────────────────────── */
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 min-h-[224px] overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-[14px] w-40 rounded-md skeleton" />
        <div className="h-[22px] w-28 rounded-full skeleton" />
      </div>
      <div className="h-[11px] w-36 rounded-md skeleton" />
      <div className="flex-1 rounded-xl skeleton min-h-[80px]" />
      <div className="h-[10px] w-24 rounded-md skeleton self-center" />
    </div>
  );
}

/* ── Pagination ────────────────────────────────────────────────────────── */
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i);
  // Clamp to show at most 7 pages with ellipsis logic
  const shown =
    total <= 7
      ? pages
      : [
          ...pages.slice(0, Math.min(3, current + 1)),
          ...(current > 3 ? [-1] : []),
          ...pages.slice(Math.max(3, current - 1), Math.min(total - 2, current + 2)),
          ...(current < total - 4 ? [-2] : []),
          ...pages.slice(total - 2),
        ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="flex items-center justify-center gap-1 mt-8 animate-fade-in">
      {/* Prev */}
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 0}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 hover:shadow-card disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {shown.map((i, idx) =>
        i < 0 ? (
          <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-300 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-all duration-150 ${
              i === current
                ? "bg-[#3b6cf5] text-white shadow-sm"
                : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-card"
            }`}
            aria-label={`Page ${i + 1}`}
            aria-current={i === current ? "page" : undefined}
          >
            {i + 1}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total - 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-gray-700 hover:shadow-card disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [range,       setRange]       = useState<TimeRange>("24h");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [units,       setUnits]       = useState<Units>("imperial");

  useEffect(() => {
    const s = loadSettings();
    setRange(s.defaultRange);
    setAutoRefresh(s.autoRefresh);
    setUnits(s.units);
  }, []);

  const { data, error, isLoading } = useSWR<GaugeSummary[]>(
    `/api/dashboard?range=${range}`,
    fetcher,
    { refreshInterval: autoRefresh ? 30_000 : 0, revalidateOnFocus: false }
  );

  const rangeOption = RANGE_OPTIONS.find((o) => o.value === range) ?? RANGE_OPTIONS[0];

  // Reset to page 0 when filter or range changes
  useEffect(() => { setPage(0); }, [search, range]);

  const filtered = data?.filter(
    (g) =>
      search === "" ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.town_state ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="max-w-6xl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-7 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight leading-tight">
            Gauges
          </h1>
          {data && (
            <p className="text-[12.5px] text-gray-400 mt-0.5 animate-fade-in">
              {filtered.length} gauge{filtered.length !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-gray-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search gauges…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 py-[7px] bg-white border border-gray-200 rounded-full text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#3b6cf5] focus:ring-2 focus:ring-[#3b6cf5]/10 shadow-card transition-all w-44 md:w-52"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <TimeRangeDropdown value={range} onChange={setRange} />
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-[13px] text-red-600 text-center animate-fade-in">
          <p className="font-medium mb-1">Failed to load gauges</p>
          <p className="text-red-400 text-xs">Make sure the backend is running on port 8000</p>
        </div>
      )}

      {/* ── Skeleton ───────────────────────────────────────────────────── */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 55} />
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-14 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-gray-600 mb-1">
            {search ? `No gauges matching "${search}"` : "No gauges found"}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-[#3b6cf5] hover:text-[#1b3a8a] transition-colors mt-1"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* ── Gauge grid ─────────────────────────────────────────────────── */}
      {paged.length > 0 && (
        <div
          key={`${page}-${range}`}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {paged.map((gauge, i) => (
            <GaugeCard
              key={gauge.id}
              gauge={gauge}
              rangeOption={rangeOption}
              units={units}
              index={i}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <>
          <Pagination current={page} total={totalPages} onChange={setPage} />
          <p className="text-center text-[11.5px] text-gray-400 mt-3 animate-fade-in tabular">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
        </>
      )}
    </div>
  );
}
