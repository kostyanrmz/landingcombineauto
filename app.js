const CHAPTERS = [
  {
    scene: "harvest",
    kicker: "01 · Поле",
    title: "Уборка идёт — учёт тоже",
    text: "Комбайн наполняет бункер. В приложении это не «примерно сколько выгрузили», а конкретная операция: кто отдал зерно и кто его принял.",
    points: ["Заполненность бункера фиксируется шагами по 10%", "Каждая выгрузка — отдельная запись, не устный пересказ"],
  },
  {
    scene: "pair",
    kicker: "02 · Рядом",
    title: "Комбайн и КамАЗ находят друг друга без интернета",
    text: "Телефоны видят технику рядом — по Bluetooth и Wi-Fi. Комбайнёр выбирает машину и отправляет запрос. Водитель принимает или отказывается.",
    points: ["Интернет для этого не нужен", "Если водитель занят — запрос можно отклонить без записи"],
  },
  {
    scene: "lock",
    kicker: "03 · Шнек",
    title: "Шнек открывается только после подтверждения",
    text: "На комбайне стоит терминал Navtelecom. Пока выгрузка не подтверждена, шнек закрыт. Телефон комбайнёра по Bluetooth отправляет на терминал своё событие — и только тогда шнек разблокируется.",
    points: ["Команду даёт приложение, не «кнопка в кабине»", "Без ответа терминала запись не создаётся — дубля не будет"],
  },
  {
    scene: "offline",
    kicker: "04 · Без сети",
    title: "В поле нет интернета — работа не останавливается",
    text: "Все операции пишутся в телефон. Связь комбайна с КамАЗом тоже локальная. Как только появился Wi-Fi или мобильная сеть, данные сами уходят в кабинет хозяйства.",
    points: ["Очередь неотправленного видна у логотипа", "На весовую лучше ехать уже после отправки рейса"],
  },
  {
    scene: "weigh",
    kicker: "05 · Весовая",
    title: "На весовой — один QR на весь рейс",
    text: "Водитель показывает код поездки. Весовая видит все погрузки по пути: с каких комбайнов забирали зерно. Факт взвешивания сходится с тем, что произошло в поле.",
    points: ["Не каждая выгрузка по отдельности — весь рейс", "Экран ярче, чтобы код читался с первого раза"],
  },
  {
    scene: "office",
    kicker: "06 · Кабинет",
    title: "Хозяйство видит уборку, а не только километраж",
    text: "Менеджер в веб-кабинете следит за рейсами, техникой и отчётами. Не после сезона — по ходу дня.",
    points: ["Комбайнёры, перевозчики, бункеры — в одном месте", "Можно работать без замка шнека, если терминала ещё нет"],
  },
];

const stage = document.getElementById("stage");
const kickerEl = document.getElementById("storyKicker");
const titleEl = document.getElementById("storyTitle");
const textEl = document.getElementById("storyText");
const pointsEl = document.getElementById("storyPoints");
const stepsEl = document.getElementById("storySteps");
const barEl = document.getElementById("storyBar");
const lockLabel = document.getElementById("lockLabel");
const termStatus = document.getElementById("termStatus");
const signalText = document.getElementById("signalText");
const syncCloud = document.getElementById("syncCloud");

CHAPTERS.forEach((_, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = String(i + 1).padStart(2, "0");
  b.addEventListener("click", () => {
    const spacers = document.querySelectorAll(".story-spacer");
    spacers[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  stepsEl.appendChild(b);
});

let current = -1;

function renderChapter(index, local) {
  const ch = CHAPTERS[index];
  if (index !== current) {
    current = index;
    kickerEl.textContent = ch.kicker;
    titleEl.textContent = ch.title;
    textEl.textContent = ch.text;
    pointsEl.innerHTML = ch.points
      .map((p) => `<li><span class="mark"></span>${p}</li>`)
      .join("");
    stage.dataset.scene = ch.scene;
    [...stepsEl.children].forEach((btn, i) => btn.classList.toggle("on", i === index));
  }

  const unlocked = ch.scene === "lock" && local > 0.42;
  stage.classList.toggle("unlocked", unlocked);
  if (ch.scene === "lock") {
    lockLabel.textContent = unlocked ? "Шнек разблокирован" : "Шнек заблокирован";
    termStatus.textContent = unlocked ? "событие принято · Bluetooth" : "ожидает событие";
  }

  const online = ch.scene === "offline" && local > 0.45;
  stage.classList.toggle("online", online);
  if (ch.scene === "offline") {
    signalText.textContent = online
      ? "Появился Wi-Fi — пакеты уходят на сервер."
      : "Интернета нет. Работа продолжается.";
    syncCloud.textContent = online ? "Отправлено в кабинет" : "Облако ждёт сеть";
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

let freezeStory = false;

function updateStory() {
  if (freezeStory) return;
  const section = document.querySelector(".story-inner");
  if (!section) return;
  const rect = section.getBoundingClientRect();
  const total = Math.max(1, section.offsetHeight - window.innerHeight);
  const scrolled = clamp(-rect.top, 0, total);
  const p = scrolled / total;
  barEl.style.width = `${p * 100}%`;
  const n = CHAPTERS.length;
  const raw = p * n;
  const idx = Math.min(n - 1, Math.floor(raw + 1e-6));
  const local = clamp(raw - idx, 0, 1);
  renderChapter(idx, local);
}

window.addEventListener("scroll", updateStory, { passive: true });
window.addEventListener("resize", updateStory);
renderChapter(0, 0);
updateStory();

const params = new URLSearchParams(location.search);
const preview = params.get("preview");
if (preview !== null) {
  freezeStory = true;
  document.body.classList.add("preview");
  const i = clamp(Number(preview) || 0, 0, CHAPTERS.length - 1);
  renderChapter(i, 0.65);
}

const shot = Number(params.get("shot"));
if (!Number.isNaN(shot) && shot >= 0 && preview === null) {
  const spacers = document.querySelectorAll(".story-spacer");
  const target = spacers[Math.min(shot, spacers.length - 1)];
  if (target) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      updateStory();
    });
  }
}

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
