"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import type { GaugeSummary } from "@/types";

interface Props {
  gauges: GaugeSummary[];
}

function markerColor(gauge: GaugeSummary): string {
  if (gauge.online_state === "offline") return "#6b7280";
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
  const positioned = gauges.filter(
    (g) => g.latitude != null && g.longitude != null
  );

  return (
    <MapContainer
      center={[45.2, -69.0]}
      zoom={7}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positioned.map((gauge) => (
        <Marker
          key={gauge.id}
          position={[gauge.latitude!, gauge.longitude!]}
          icon={makeIcon(markerColor(gauge))}
        >
          <Popup>
            <div style={{ minWidth: 170, fontFamily: "inherit" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 2, lineHeight: 1.3 }}>
                {gauge.name}
              </div>
              {gauge.town_state && (
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                  {gauge.town_state}
                </div>
              )}
              {gauge.sparkline.length > 0 && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
                  {gauge.sparkline[gauge.sparkline.length - 1].y.toFixed(2)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280", marginLeft: 3 }}>in</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: gauge.online_state === "online" ? "#dcfce7" : "#f3f4f6",
                  color: gauge.online_state === "online" ? "#15803d" : "#6b7280",
                }}>
                  {gauge.online_state.charAt(0).toUpperCase() + gauge.online_state.slice(1)}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: gauge.battery_state === "healthy" ? "#eff6ff" : gauge.battery_state === "mid" ? "#fffbeb" : "#fef2f2",
                  color: gauge.battery_state === "healthy" ? "#1d4ed8" : gauge.battery_state === "mid" ? "#b45309" : "#b91c1c",
                }}>
                  {gauge.battery_state.charAt(0).toUpperCase() + gauge.battery_state.slice(1)}
                </span>
              </div>
              <Link
                href={`/dashboard/gauges/${gauge.id}`}
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#3b6cf5",
                  textDecoration: "none",
                }}
              >
                View Details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
