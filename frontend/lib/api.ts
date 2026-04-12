import type {
  AlertSubscribePayload,
  AlertSubscribeResponse,
  GaugeSummary,
  TimeRange,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchDashboard(range: TimeRange): Promise<GaugeSummary[]> {
  const res = await fetch(`${BASE}/api/dashboard?range=${range}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
  return res.json();
}

export async function subscribeAlert(
  payload: AlertSubscribePayload
): Promise<AlertSubscribeResponse> {
  const res = await fetch(`${BASE}/api/alerts/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) throw new Error("already_subscribed");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Subscribe failed: ${res.status}`);
  }
  return res.json();
}

export async function unsubscribeAlert(token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/alerts/unsubscribe/${token}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Unsubscribe failed: ${res.status}`);
}

export async function fetchGaugeList(): Promise<
  { id: number; name: string; town_state: string | null }[]
> {
  const res = await fetch(`${BASE}/api/gauges`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Gauges fetch failed: ${res.status}`);
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
