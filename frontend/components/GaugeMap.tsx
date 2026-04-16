"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GaugeSummary } from "@/types";

interface Props {
  gauges: GaugeSummary[];
}

function markerColor(gauge: GaugeSummary): string {
  if (gauge.battery_state === "replace") return "#ef4444";
  if (gauge.battery_state === "mid") return "#f59e0b";
  return "#3b6cf5";
}

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 10.5 13 21 13 21S26 23.5 26 13C26 5.82 20.18 0 13 0z" fill="${color}" opacity="0.92"/>
      <circle cx="13" cy="13" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -36],
  });
}

export default function GaugeMap({ gauges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Remove any existing instance so re-mounts don't throw
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current).setView([45.2, -69.0], 7);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    gauges
      .filter((g) => g.latitude != null && g.longitude != null)
      .forEach((gauge) => {
        const lastReading =
          gauge.sparkline.length > 0
            ? gauge.sparkline[gauge.sparkline.length - 1].y.toFixed(2) + " in"
            : "No data";

        const onlineBg    = gauge.online_state === "online" ? "#dcfce7" : "#f3f4f6";
        const onlineColor = gauge.online_state === "online" ? "#15803d" : "#6b7280";
        const battBg      = gauge.battery_state === "healthy" ? "#eff6ff" : gauge.battery_state === "mid" ? "#fffbeb" : "#fef2f2";
        const battColor   = gauge.battery_state === "healthy" ? "#1d4ed8" : gauge.battery_state === "mid" ? "#b45309" : "#b91c1c";
        const cap         = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

        L.marker([gauge.latitude!, gauge.longitude!], { icon: makeIcon(markerColor(gauge)) })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:170px;font-family:inherit">
              <div style="font-weight:700;font-size:13px;color:#111827;margin-bottom:2px;line-height:1.3">${gauge.name}</div>
              ${gauge.town_state ? `<div style="font-size:11px;color:#6b7280;margin-bottom:6px">${gauge.town_state}</div>` : ""}
              <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px">${lastReading}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:${onlineBg};color:${onlineColor}">${cap(gauge.online_state)}</span>
                <span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:${battBg};color:${battColor}">${cap(gauge.battery_state)}</span>
              </div>
              <a href="/dashboard/gauges/${gauge.id}" style="font-size:12px;font-weight:600;color:#3b6cf5;text-decoration:none">View Details →</a>
            </div>
          `);
      });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [gauges]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
