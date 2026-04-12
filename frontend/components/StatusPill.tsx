import type { OnlineState } from "@/types";

export default function StatusPill({ state }: { state: OnlineState }) {
  const online = state === "online";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${
        online ? "text-green-600" : "text-gray-400"
      }`}
    >
      {online ? (
        <span className="relative flex h-[7px] w-[7px] flex-shrink-0">
          <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-green-500" />
        </span>
      ) : (
        <span className="w-[7px] h-[7px] rounded-full bg-gray-300 flex-shrink-0" />
      )}
      {online ? "Online" : "Offline"}
    </span>
  );
}
