import type { BatteryState } from "@/types";

const CONFIG: Record<
  BatteryState,
  { dot: string; label: string; bg: string; text: string }
> = {
  healthy: {
    dot:   "bg-green-500",
    label: "Battery: Healthy",
    bg:    "bg-gray-100",
    text:  "text-gray-600",
  },
  mid: {
    dot:   "bg-amber-400",
    label: "Battery: Mid",
    bg:    "bg-amber-50",
    text:  "text-amber-700",
  },
  replace: {
    dot:   "bg-red-500",
    label: "Battery: Replace",
    bg:    "bg-red-50",
    text:  "text-red-700",
  },
  unknown: {
    dot:   "bg-gray-400",
    label: "Battery: Unknown",
    bg:    "bg-gray-100",
    text:  "text-gray-500",
  },
};

export default function BatteryChip({ state }: { state: BatteryState }) {
  const { dot, label, bg, text } = CONFIG[state] ?? CONFIG.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-medium whitespace-nowrap flex-shrink-0 ${bg} ${text}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
