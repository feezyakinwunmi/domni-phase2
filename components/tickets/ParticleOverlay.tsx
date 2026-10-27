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

// [x, y, radius] in a 100×100 viewBox — deterministic for SSR.
const STAR_POINTS: [number, number, number][] = [
  [8, 10, 2.2], [26, 4, 1.2], [44, 14, 1.6], [70, 6, 2.6], [90, 16, 1.4],
  [14, 34, 1.3], [58, 28, 1.1], [84, 38, 2], [6, 62, 1.8], [36, 56, 1.2],
  [64, 70, 2.4], [92, 66, 1.2], [20, 86, 1.5], [50, 92, 1.9], [80, 88, 1.3],
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

  if (variant === "waves") {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <defs>
          <pattern id={`waves-${id}`} width="60" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M0 12 Q 15 2 30 12 T 60 12"
              fill="none"
              stroke={color}
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#waves-${id})`} />
      </svg>
    );
  }

  if (variant === "stars") {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        style={{ opacity }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {STAR_POINTS.map(([x, y, r], i) => (
          <path
            key={i}
            d={`M${x} ${y - r} L${x + r * 0.25} ${y - r * 0.25} L${x + r} ${y} L${x + r * 0.25} ${y + r * 0.25} L${x} ${y + r} L${x - r * 0.25} ${y + r * 0.25} L${x - r} ${y} L${x - r * 0.25} ${y - r * 0.25} Z`}
            fill={color}
            fillOpacity={0.5}
          />
        ))}
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
