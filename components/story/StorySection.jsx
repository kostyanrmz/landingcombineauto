"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import World from "./World";

export default function StorySection() {
  const frozen = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("shot");
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  }, []);

  const trackRef = useRef(null);
  const progressRef = useRef(frozen ?? 0);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 52, damping: 26, mass: 0.42 });

  useMotionValueEvent(smooth, "change", (v) => {
    if (frozen != null) return;
    progressRef.current = v;
  });

  useEffect(() => {
    if (frozen == null) return;
    document.body.classList.add("shot");
    return () => document.body.classList.remove("shot");
  }, [frozen]);

  const dpr = useMemo(() => (typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.75) : 1), []);

  return (
    <section className="story-track" id="story" ref={trackRef}>
      <div className="story-sticky">
        <Canvas
          dpr={dpr}
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          camera={{ fov: 36, near: 0.1, far: 140, position: [-10.5, 2.9, 9] }}
        >
          <World progressRef={progressRef} />
        </Canvas>
        <p className="story-hint">Листайте — камера ведёт историю</p>
      </div>
    </section>
  );
}
