"use client";

import { useEffect, useState } from "react";
import AlertModal from "@/components/AlertModal";
import { unsubscribeAlert } from "@/lib/api";
import type {
  AlertCondition,
  AlertSubscribeResponse,
  LocalAlertRule,
} from "@/types";

const LS_KEY = "river_gauge_subscriptions";

function ConditionBadge({ condition }: { condition: AlertCondition }) {
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

function loadFromStorage(): LocalAlertRule[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalAlertRule[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(rules: LocalAlertRule[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rules));
}

export default function AlertsPage() {
  const [rules, setRules] = useState<LocalAlertRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setRules(loadFromStorage());
    setHydrated(true);
  }, []);

  const handleSuccess = (res: AlertSubscribeResponse, gaugeName: string) => {
    const newRule: LocalAlertRule = {
      token:          res.token,
      gauge_id:       res.gauge_id,
      gauge_name:     gaugeName,
      condition:      res.condition,
      threshold_in:   res.threshold_in,
      channel:        res.channel,
      contact_masked: res.contact,
      active:         true,
    };
    const updated = [newRule, ...rules];
    setRules(updated);
    saveToStorage(updated);
    setShowModal(false);
    setSuccessBanner(
      `Subscribed! You'll be notified at ${res.contact} when ${gaugeName} is ${res.condition} ${res.threshold_in.toFixed(2)} in.`
    );
  };

  const handleToggle = (token: string) => {
    const updated = rules.map((r) =>
      r.token === token ? { ...r, active: !r.active } : r
    );
    setRules(updated);
    saveToStorage(updated);
  };

  const handleDelete = async (token: string) => {
    try {
      await unsubscribeAlert(token);
    } catch {
      // If the backend fails, still remove locally
    }
    const updated = rules.filter((r) => r.token !== token);
    setRules(updated);
    saveToStorage(updated);
  };

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
          onClick={() => setShowModal(true)}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New rule
        </button>
      </div>

      {/* Success banner */}
      {successBanner && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-green-50 border border-green-100 animate-fade-in">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-[11.5px] text-green-700 leading-relaxed flex-1">{successBanner}</p>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-green-400 hover:text-green-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Rules list */}
      {!hydrated ? null : rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div
              key={rule.token}
              className="bg-white rounded-2xl border border-gray-100 shadow-card px-5 py-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              {/* Toggle */}
              <button
                onClick={() => handleToggle(rule.token)}
                className={`relative flex-shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
                  rule.active ? "bg-[#3b6cf5]" : "bg-gray-200"
                }`}
                style={{ height: "22px", width: "40px" }}
                aria-label={rule.active ? "Disable rule" : "Enable rule"}
              >
                <span
                  className={`absolute top-[3px] left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    rule.active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 leading-snug truncate">
                  {rule.gauge_name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <ConditionBadge condition={rule.condition} />
                  <span className="text-[11.5px] font-semibold text-gray-700 tabular">
                    {rule.threshold_in.toFixed(2)} in
                  </span>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <span className="text-[11px] text-gray-400 capitalize">{rule.channel}</span>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <span className="text-[11px] text-gray-400">{rule.contact_masked}</span>
                </div>
              </div>

              {/* Status dot — hidden on mobile */}
              {rule.active && (
                <span className="hidden sm:flex relative h-2 w-2 flex-shrink-0">
                  <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(rule.token)}
                className="p-2 -mr-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            onClick={() => setShowModal(true)}
          >
            Create your first rule
          </button>
        </div>
      )}

      <AlertModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
