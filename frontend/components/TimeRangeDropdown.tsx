"use client";

import { useEffect, useRef, useState } from "react";
import { RANGE_OPTIONS, type TimeRange } from "@/types";

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export default function TimeRangeDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = RANGE_OPTIONS.find((o) => o.value === value) ?? RANGE_OPTIONS[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 pl-3.5 pr-2.5 py-[7px] bg-white border rounded-full text-[13px] font-medium transition-all duration-150 shadow-card ${
          open
            ? "border-[#3b6cf5] text-gray-800"
            : "border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-800"
        }`}
      >
        {selected.label}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-dropdown z-50 py-1.5 origin-top transition-all duration-150 ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        {RANGE_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-blue-50 text-[#3b6cf5] font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {opt.dropdownLabel}
              {active && (
                <svg className="w-3.5 h-3.5 text-[#3b6cf5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
