"use client";

import { useEffect, useRef } from "react";
import type { SparklinePoint } from "@/types";

interface Props {
  data: SparklinePoint[];
  height?: number;
}

export default function SparklineChart({ data, height = 110 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  const buildOption = (pts: SparklinePoint[]) => {
    const seriesData = pts.map((d) => [new Date(d.ts).getTime(), d.y]);
    const yValues = pts.map((d) => d.y);
    const yMin = yValues.length ? Math.min(...yValues) : 0;
    const yMax = yValues.length ? Math.max(...yValues) : 10;
    const pad   = (yMax - yMin) * 0.18 || 0.5;

    return {
      animation: false,
      grid: { top: 4, right: 10, bottom: 4, left: 42, containLabel: false },
      xAxis: { type: "time", show: false, boundaryGap: false },
      yAxis: {
        type: "value",
        min: Math.max(0, yMin - pad),
        max: yMax + pad,
        splitNumber: 3,
        axisLabel: {
          show: true,
          fontSize: 9,
          color: "#c4c9d4",
          formatter: (v: number) => v.toFixed(0),
          margin: 5,
        },
        splitLine: {
          show: true,
          lineStyle: { color: "#e2e8f0", width: 1 },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "line",
          data: seriesData,
          smooth: 0.45,
          symbol: "none",
          sampling: "lttb",
          lineStyle: { color: "#3b6cf5", width: 1.5 },
          areaStyle: { color: "transparent" },
        },
      ],
      tooltip: { show: false },
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const echarts = await import("echarts");
      if (cancelled || !containerRef.current) return;

      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: "svg" });
      chartRef.current.setOption(buildOption(data), true);
    })();

    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chartRef.current) chartRef.current.setOption(buildOption(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
