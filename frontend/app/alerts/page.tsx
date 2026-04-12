"use client";

import { useState } from "react";

interface AlertRule {
  id: number;
  gauge: string;
  condition: string;
  threshold: string;
  channel: string;
  active: boolean;
}

const SAMPLE_RULES: AlertRule[] = [
  { id: 1, gauge: "Sandy River – Site 1", condition: "above", threshold: "12.00 in", channel: "Email", active: true },
  { id: 2, gauge: "Androscoggin River", condition: "below", threshold: "2.50 in", channel: "SMS",   active: false },
];

function ConditionBadge({ condition }: { condition: string }) {
  const up = condition === "above";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
        up ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
      }`}
    >
      {up ? (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ) : (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      )}
      {condition}
    </span>
  );
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>(SAMPLE_RULES);

  const toggle = (id: number) =>
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );

  return (
    <div className="max-w-3xl page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight leading-tight">
            Alerts
          </h1>
          <p className="text-[12.5px] text-gray-400 mt-0.5">
            Threshold notifications for water level changes
          </p>
        </div>

        <button
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-white bg-[#3b6cf5] hover:bg-[#2b5ce0] px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          onClick={() => {}}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New rule
        </button>
      </div>

      {/* Rules list */}
      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-card px-5 py-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              {/* Toggle */}
              <button
                onClick={() => toggle(rule.id)}
                className={`relative w-8 h-4.5 rounded-full transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
                  rule.active ? "bg-[#3b6cf5]" : "bg-gray-200"
                }`}
                style={{ height: "18px", width: "32px" }}
                aria-label={rule.active ? "Disable rule" : "Enable rule"}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${
                    rule.active ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 leading-snug truncate">
                  {rule.gauge}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <ConditionBadge condition={rule.condition} />
                  <span className="text-[11.5px] font-semibold text-gray-700 tabular">
                    {rule.threshold}
                  </span>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <span className="text-[11px] text-gray-400">{rule.channel}</span>
                </div>
              </div>

              {/* Status dot */}
              {rule.active && (
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}
                className="p-1.5 -mr-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                aria-label="Delete rule"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-14 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-gray-600 mb-1">No alert rules</p>
          <p className="text-xs text-gray-400 mb-4">
            Create a rule to get notified when water levels cross a threshold.
          </p>
          <button
            className="text-xs font-medium text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
            onClick={() => {}}
          >
            Create your first rule
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="mt-6 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-100 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11.5px] text-blue-700 leading-relaxed">
          Alert delivery (email, SMS, webhook) requires backend notification configuration.
          Rules shown here are stored locally for preview purposes.
        </p>
      </div>
    </div>
  );
}
