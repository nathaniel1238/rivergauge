"use client";

import { useEffect } from "react";
import AlertForm from "./AlertForm";
import type { AlertSubscribeResponse } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (res: AlertSubscribeResponse, gaugeName: string) => void;
}

export default function AlertModal({ open, onClose, onSuccess }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet (mobile) / Card (desktop) */}
      <div className="relative z-50 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-slide-up sm:animate-fade-in">
        {/* Drag handle — mobile only */}
        <div className="sm:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">New alert rule</h2>
            <p className="text-[11.5px] text-gray-400 mt-0.5">
              Get notified when a river level crosses a threshold.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <AlertForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
