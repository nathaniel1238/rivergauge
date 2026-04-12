import type { GaugeSummary, TimeRange } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchDashboard(range: TimeRange): Promise<GaugeSummary[]> {
  const res = await fetch(`${BASE}/api/dashboard?range=${range}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
  return res.json();
}

export function timeAgo(isoString: string | null): string {
  if (!isoString) return "unknown";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
