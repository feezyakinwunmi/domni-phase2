"use client";

import { useId } from "react";
import type { ParticleVariant } from "./types";

const CONFETTI_SHAPES: {
  x: number;
  y: number;
  size: number;
  rotate: number;
  shape: "rect" | "tri" | "ring";
}[] = [
  { x: 12, y: 8, size: 7, rotate: 18, shape: "rect" },
  { x: 82, y: 14, size: 9, rotate: -24, shape: "tri" },
  { x: 60, y: 6, size: 5, rotate: 40, shape: "ring" },
  { x: 30, y: 22, size: 6, rotate: -10, shape: "ring" },
  { x: 90, y: 30, size: 8, rotate: 12, shape: "rect" },
  { x: 8, y: 36, size: 6, rotate: -30, shape: "tri" },
  { x: 70, y: 42, size: 5, rotate: 22, shape: "rect" },
  { x: 45, y: 12, size: 4, rotate: 0, shape: "ring" },
  { x: 20, y: 50, size: 7, rotate: 15, shape: "tri" },
  { x: 95, y: 55, size: 5, rotate: -18, shape: "ring" },
];

export function ParticleOverlay({
  variant = "none",
  color = "#ffffff",
  opacity = 1,
  className = "",
}: {
  variant?: ParticleVariant;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  const rawId = useId();
  const id = rawId.replace(/[:]/g, "");

  if (variant === "none") return null;

  if (variant === "dots") {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`dots-${id}`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.3" fill={color} fillOpacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${id})`} />
      </svg>
    );
  }

  if (variant === "geometric") {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`geo-${id}`}
            width="46"
            height="46"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(20)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="46"
              stroke={color}
              strokeOpacity="0.16"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="0"
              x2="46"
              y2="0"
              stroke={color}
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#geo-${id})`} />
      </svg>
    );
  }

  // confetti — fixed, deterministic scattered vector shapes (no randomness,
  // so server/client render identically and nothing shifts between renders)
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity }}
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {CONFETTI_SHAPES.map((s, i) => {
        const transform = `translate(${s.x} ${s.y}) rotate(${s.rotate})`;

        if (s.shape === "rect") {
          return (
            <rect
              key={i}
              x={-s.size / 2}
              y={-s.size / 4}
              width={s.size}
              height={s.size / 2}
              fill={color}
              fillOpacity="0.4"
              transform={transform}
            />
          );
        }

        if (s.shape === "tri") {
          const h = s.size;
          return (
            <polygon
              key={i}
              points={`0,${-h / 2} ${h / 2},${h / 2} ${-h / 2},${h / 2}`}
              fill={color}
              fillOpacity="0.4"
              transform={transform}
            />
          );
        }

        return (
          <circle
            key={i}
            r={s.size / 3}
            fill="none"
            stroke={color}
            strokeOpacity="0.45"
            strokeWidth="1"
            transform={transform}
          />
        );
      })}
    </svg>
  );
}
