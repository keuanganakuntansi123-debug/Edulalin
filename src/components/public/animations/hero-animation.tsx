"use client";

import { useSyncExternalStore } from "react";
import { BicycleScene } from "./bicycle-scene";
import { PoliceCrossingScene } from "./police-crossing-scene";

const emptySubscribe = () => () => {};

let reducedMq: MediaQueryList | null = null;
function getReducedMq(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (!reducedMq) reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMq;
}

function getReducedSnapshot(): boolean {
  return getReducedMq()?.matches ?? false;
}

function subscribeReduced(cb: () => void) {
  const mq = getReducedMq();
  if (!mq) return emptySubscribe();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Pembungkus animasi hero Beranda.
 * - Menghormati prefers-reduced-motion (fallback gambar statis).
 * - Hanya dirender di client (hindari mismatch SSR) dan menunggu konten dimuat.
 */
export function HeroAnimation({
  variant = "bicycle",
  className,
}: {
  variant?: "bicycle" | "police";
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => typeof window !== "undefined",
    () => false
  );
  const reduced = useSyncExternalStore(
    subscribeReduced,
    getReducedSnapshot,
    () => false
  );

  if (!mounted) {
    // Fallback statis (SSR/awal)
    return (
      <div className={className} aria-hidden="true">
        {variant === "bicycle" ? <BicycleScene /> : <PoliceCrossingScene />}
      </div>
    );
  }

  return (
    <div
      className={className}
      aria-hidden="true"
      data-reduced-motion={reduced ? "true" : "false"}
    >
      {variant === "bicycle" ? <BicycleScene /> : <PoliceCrossingScene />}
    </div>
  );
}
