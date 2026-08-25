"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import World from "./World";

const BEATS = [
  {
    at: 0.035,
    kicker: "01 · Комбайн",
    title: "Комбайн собирается из частиц",
    text: "Камера облетает технику. В кабине — терминал Navtelecom, связь с полем без интернета.",
  },
  {
    at: 0.09,
    kicker: "02 · Терминал",
    title: "Navtelecom в кабине",
    text: "Синий сгусток — бортовой терминал. Через него комбайн выходит на связь с перевозчиками.",
  },
  {
    at: 0.13,
    kicker: "03 · Шнек",
    title: "Шнек заблокирован",
    text: "Пока нет разрешения — красный индикатор на шнеке. Выгрузка закрыта.",
  },
  {
    at: 0.17,
    kicker: "04 · Поиск",
    title: "Combine Auto ищет перевозчика",
    text: "Приложение отправляет запрос ближайшим машинам.",
  },
  {
    at: 0.23,
    kicker: "05 · Волна",
    title: "Сигнал расходится по полю",
    text: "Взрывная волна частиц — запрос уходит в сторону грузовика. Камера отдаляется.",
  },
  {
    at: 0.3,
    kicker: "06 · Грузовик",
    title: "Машина собирается впереди комбайна",
    text: "На краю волны из частиц появляется грузовик. Камера облетает его.",
  },
  {
    at: 0.5,
    kicker: "07 · Запрос",
    title: "Водитель получает запрос",
    text: "Камера залетает за грузовик — карточка Combine Auto и кнопка «Принять».",
  },
  {
    at: 0.62,
    kicker: "08 · Ответ",
    title: "Камера разворачивается к комбайну",
    text: "Грузовик пропадает. Волна ответа — камера летит обратно. «Запрос принят».",
  },
  {
    at: 0.66,
    kicker: "09 · Разблокировка",
    title: "Шнек разблокирован",
    text: "Красный сгусток гаснет. Терминал открывает шнек только этой машине.",
  },
  {
    at: 0.76,
    kicker: "10 · Труба",
    title: "Шнек выдвигается",
    text: "Из модели убран старый шнек — вместо него выезжает настоящая труба выгрузки.",
  },
  {
    at: 0.88,
    kicker: "11 · Выгрузка",
    title: "Грузовик подъезжает боком",
    text: "Машина собирается рядом с комбайном. Зерно течёт по трубе в кузов.",
  },
];

function pickBeat(p) {
  let best = BEATS[0];
  let dist = 1;
  for (const b of BEATS) {
    const d = Math.abs(p - b.at);
    if (d < dist) {
      dist = d;
      best = b;
    }
  }
  return best;
}

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
  const [beat, setBeat] = useState(pickBeat(frozen ?? 0));

  useMotionValueEvent(smooth, "change", (v) => {
    if (frozen != null) return;
    progressRef.current = v;
    const next = pickBeat(v);
    setBeat((cur) => (cur.at === next.at ? cur : next));
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
          camera={{ fov: 36, near: 0.1, far: 100, position: [-10.5, 2.9, 9] }}
        >
          <World progressRef={progressRef} />
        </Canvas>
        <div className="story-caption glass-card">
          <p className="story-kicker">{beat.kicker}</p>
          <h2 className="story-title">{beat.title}</h2>
          <p className="story-text">{beat.text}</p>
        </div>
        <p className="story-hint">Листайте — камера ведёт историю</p>
      </div>
    </section>
  );
}
