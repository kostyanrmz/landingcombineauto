import { mountBlueprint } from "./schematic.js";

const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
function closeMenu() {
  mobileMenu.classList.remove("open");
  hamburgerBtn.classList.remove("open");
  hamburgerBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}
hamburgerBtn.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  hamburgerBtn.classList.toggle("open", isOpen);
  hamburgerBtn.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("click", (e) => {
  if (!mobileMenu.classList.contains("open")) return;
  if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) closeMenu();
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMenu();
});

(function reveal() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("on");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
})();

document.getElementById("leadForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("f-name").value.trim();
  const phone = document.getElementById("f-phone").value.trim();
  const note = document.getElementById("f-note").value.trim();
  const body = `Здравствуйте! Интересует Combine Auto.\nИмя/хозяйство: ${name}\nТелефон: ${phone}${note ? `\nЗадача: ${note}` : ""}`;
  window.open(`https://wa.me/77085474323?text=${encodeURIComponent(body)}`, "_blank");
});

mountBlueprint(document.getElementById("story"));

(async function tubes() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (coarse || reduce) return;
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js");
    const TubesCursor = mod.default;
    const canvas = document.getElementById("canvas");
    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    }
    sizeCanvas();
    const app = TubesCursor(canvas, {
      tubes: {
        colors: ["#22c55e", "#84cc16", "#eab308", "#4ade80"],
        lights: { intensity: 50, colors: ["#22c55e", "#84cc16", "#eab308", "#ffffff"] },
      },
    });
    window.addEventListener("resize", () => {
      sizeCanvas();
      if (app && typeof app.resize === "function") app.resize();
    });
    let lastRealMove = performance.now();
    function markRealMove(e) {
      if (e.isTrusted) lastRealMove = performance.now();
    }
    window.addEventListener("mousemove", markRealMove, { passive: true });
    window.addEventListener("pointermove", markRealMove, { passive: true });
    function idleLoop(t) {
      if (performance.now() - lastRealMove > 1800) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight * 0.42;
        const rx = Math.min(window.innerWidth * 0.32, 440);
        const ry = Math.min(window.innerHeight * 0.24, 240);
        const time = t * 0.00045;
        const x = cx + Math.cos(time) * rx;
        const y = cy + Math.sin(time) * Math.cos(time) * ry;
        const opts = { clientX: x, clientY: y, bubbles: true };
        window.dispatchEvent(new MouseEvent("mousemove", opts));
        if (window.PointerEvent) window.dispatchEvent(new PointerEvent("pointermove", opts));
      }
      requestAnimationFrame(idleLoop);
    }
    requestAnimationFrame(idleLoop);
  } catch (err) {
    console.warn("Background tubes skipped", err);
  }
})();
