"use client";

import { useEffect, useState } from "react";
import { fetchGaugeList, subscribeAlert } from "@/lib/api";
import type { AlertChannel, AlertCondition, AlertSubscribeResponse } from "@/types";

interface Props {
  onSuccess: (res: AlertSubscribeResponse, gaugeName: string) => void;
}

type FormState = "idle" | "submitting" | "success" | "error";

function ConditionToggle({
  value,
  onChange,
}: {
  value: AlertCondition;
  onChange: (v: AlertCondition) => void;
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden text-[12.5px] font-medium">
      {(["above", "below"] as AlertCondition[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 px-3 transition-colors capitalize ${
            value === opt
              ? opt === "above"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-600"
              : "bg-white text-gray-400 hover:text-gray-600"
          }`}
        >
          {opt === "above" ? "▲ Above" : "▼ Below"}
        </button>
      ))}
    </div>
  );
}

function ChannelToggle({
  value,
  onChange,
}: {
  value: AlertChannel;
  onChange: (v: AlertChannel) => void;
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden text-[12.5px] font-medium">
      {(["email", "sms"] as AlertChannel[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 px-3 transition-colors ${
            value === opt
              ? "bg-[#3b6cf5] text-white"
              : "bg-white text-gray-400 hover:text-gray-600"
          }`}
        >
          {opt === "email" ? "✉ Email" : "💬 SMS"}
        </button>
      ))}
    </div>
  );
}

export default function AlertForm({ onSuccess }: Props) {
  const [gauges, setGauges] = useState<{ id: number; name: string; town_state: string | null }[]>([]);
  const [gaugeId, setGaugeId] = useState<number | "">("");
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [threshold, setThreshold] = useState("");
  const [channel, setChannel] = useState<AlertChannel>("email");
  const [contact, setContact] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchGaugeList()
      .then(setGauges)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gaugeId === "") return;

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setErrorMsg("Enter a valid threshold in inches.");
      setFormState("error");
      return;
    }

    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await subscribeAlert({
        gauge_id: gaugeId,
        condition,
        threshold_in: thresholdNum,
        channel,
        contact: contact.trim(),
      });
      const gaugeName = gauges.find((g) => g.id === gaugeId)?.name ?? `Gauge ${gaugeId}`;
      setFormState("success");
      onSuccess(res, gaugeName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMsg(
        msg === "already_subscribed"
          ? "You already have an active alert with these settings."
          : msg
      );
      setFormState("error");
    }
  };

  const inputCls =
    "w-full bg-white border border-gray-200 rounded-xl text-[13px] px-3 py-2.5 focus:outline-none focus:border-[#3b6cf5] focus:ring-2 focus:ring-[#3b6cf5]/10 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Gauge */}
      <div>
        <label className="block text-[11.5px] font-medium text-gray-500 mb-1.5">
          River gauge
        </label>
        <select
          required
          value={gaugeId}
          onChange={(e) => setGaugeId(Number(e.target.value))}
          className={inputCls}
        >
          <option value="" disabled>
            Select a gauge…
          </option>
          {gauges.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}{g.town_state ? ` — ${g.town_state}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-[11.5px] font-medium text-gray-500 mb-1.5">
          Alert when level is…
        </label>
        <ConditionToggle value={condition} onChange={setCondition} />
      </div>

      {/* Threshold */}
      <div>
        <label className="block text-[11.5px] font-medium text-gray-500 mb-1.5">
          Threshold
        </label>
        <div className="relative">
          <input
            required
            type="number"
            step="0.1"
            min="0"
            max="500"
            placeholder="e.g. 8.5"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={`${inputCls} pr-8`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-gray-400 pointer-events-none">
            in
          </span>
        </div>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-[11.5px] font-medium text-gray-500 mb-1.5">
          Notify via
        </label>
        <ChannelToggle value={channel} onChange={(v) => { setChannel(v); setContact(""); }} />
      </div>

      {/* Contact */}
      <div>
        <label className="block text-[11.5px] font-medium text-gray-500 mb-1.5">
          {channel === "email" ? "Email address" : "Phone number"}
        </label>
        {channel === "email" ? (
          <input
            required
            type="email"
            placeholder="you@example.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={inputCls}
          />
        ) : (
          <input
            required
            type="tel"
            placeholder="+12125551234"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={inputCls}
          />
        )}
        {channel === "sms" && (
          <p className="text-[10.5px] text-gray-400 mt-1">
            Use E.164 format: +1 followed by 10 digits.
          </p>
        )}
      </div>

      {/* Error */}
      {formState === "error" && (
        <p className="text-[11.5px] text-red-500">{errorMsg}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={formState === "submitting"}
        className="w-full bg-[#3b6cf5] hover:bg-[#2b5ce0] disabled:opacity-60 text-white text-[12.5px] font-medium py-2.5 rounded-xl transition-colors shadow-sm"
      >
        {formState === "submitting" ? "Subscribing…" : "Create alert"}
      </button>
    </form>
  );
}
