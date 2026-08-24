const BEATS = [
  {
    id: "kamaz",
    kicker: "01 · Чертёж",
    title: "Сначала на схеме появляется КамАЗ",
    text: "Машина подъехала за зерном. Шнек пока закрыт — выгрузки ещё нет.",
  },
  {
    id: "combine",
    kicker: "02 · Комбайн",
    title: "Комбайн дорисовывается рядом",
    text: "Бункер полный. На крыше — терминал, на трубе шнека — замок. Без согласия водителя зерно не уйдёт.",
  },
  {
    id: "request",
    kicker: "03 · Запрос",
    title: "Комбайнёр жмёт «отправить» у себя в телефоне",
    text: "Не радио и не крик через поле. Короткий запрос: кто я, сколько зерна, готов выгружать.",
  },
  {
    id: "fly-out",
    kicker: "04 · Сигнал",
    title: "Сигнал летит в телефон КамАЗа",
    text: "Интернет не нужен. Телефоны видят друг друга рядом — по Bluetooth и Wi-Fi.",
  },
  {
    id: "notify",
    kicker: "05 · Уведомление",
    title: "У водителя всплывает запрос",
    text: "На экране: выгрузка, бункер 70%. Пока он не нажмёт — шнек закрыт.",
  },
  {
    id: "accept",
    kicker: "06 · Принять",
    title: "Водитель нажимает «Принять»",
    text: "Это не галочка в журнале. Это разрешение открыть шнек именно этой машине.",
  },
  {
    id: "fly-back",
    kicker: "07 · Ответ",
    title: "Ответ летит обратно в комбайн",
    text: "Телефон комбайнёра получает «принято». Только после этого можно говорить с терминалом.",
  },
  {
    id: "bluetooth",
    kicker: "08 · Bluetooth",
    title: "Из телефона — в терминал на комбайне",
    text: "Команда уходит по Bluetooth на Navtelecom. Не из кабины кнопкой, а из приложения — своим событием.",
  },
  {
    id: "unlock",
    kicker: "09 · Шнек",
    title: "Замок снимается, зерно идёт в кузов",
    text: "Терминал принял событие. Шнек открыт. Запись появляется у обоих — дубля не будет.",
  },
  {
    id: "offline",
    kicker: "10 · Без сети",
    title: "В поле нет интернета — схема уже сохранена",
    text: "Операция живёт в телефонах. Когда появится Wi-Fi, пакет сам уйдёт в кабинет хозяйства.",
  },
  {
    id: "weigh",
    kicker: "11 · Весовая",
    title: "На току водитель показывает QR рейса",
    text: "Один код на всю поездку: все погрузки с комбайнов и факт веса сходятся.",
  },
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function range(p, a, b) {
  if (b === a) return p >= a ? 1 : 0;
  return clamp((p - a) / (b - a), 0, 1);
}
function ease(t) {
  return t * t * (3 - 2 * t);
}

function setupInk(svg) {
  $$("[data-draw]", svg).forEach((group) => {
    const shapes = group.matches("path,circle,rect,line,polyline,ellipse")
      ? [group]
      : $$("path,circle,rect,line,polyline,ellipse", group);
    shapes.forEach((el) => {
      let len = 0;
      try {
        if (typeof el.getTotalLength === "function") len = el.getTotalLength();
      } catch {
        len = 0;
      }
      if (!len || !isFinite(len)) len = 0;
      el.dataset.len = String(len);
      if (len > 1) {
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
      }
    });
  });
}

function paintInk(svg, key, amount) {
  const t = ease(clamp(amount, 0, 1));
  $$("[data-draw='" + key + "']", svg).forEach((group) => {
    group.style.opacity = String(t);
    const shapes = group.matches("path,circle,rect,line,polyline,ellipse")
      ? [group]
      : $$("path,circle,rect,line,polyline,ellipse", group);
    shapes.forEach((el) => {
      const len = Number(el.dataset.len || 0);
      if (len > 1) {
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = String(len * (1 - t));
      }
    });
  });
}

function fade(svg, key, amount) {
  const t = ease(clamp(amount, 0, 1));
  $$("[data-fade='" + key + "']", svg).forEach((el) => {
    el.style.opacity = String(t);
  });
}

function place(packet, path, t, visible) {
  if (!packet || !path) return;
  const u = clamp(t, 0, 1);
  const len = path.getTotalLength();
  const pt = path.getPointAtLength(u * len);
  packet.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
  packet.style.opacity = visible ? "1" : "0";
}

export async function mountHero(el) {
  if (!el) return;
  const res = await fetch("blueprint.svg");
  el.innerHTML = await res.text();
  const svg = el.querySelector("svg");
  if (!svg) return;
  setupInk(svg);
  paintInk(svg, "ground", 1);
  paintInk(svg, "kamaz", 1);
  paintInk(svg, "combine", 1);
  paintInk(svg, "auger", 1);
  paintInk(svg, "terminal", 1);
  fade(svg, "title", 1);
  fade(svg, "ground-lab", 1);
  fade(svg, "kamaz-lab", 1);
  fade(svg, "combine-lab", 1);
  fade(svg, "lock-closed", 1);
  $$("[data-fade]", svg).forEach((node) => {
    const key = node.getAttribute("data-fade");
    if (["title", "ground-lab", "kamaz-lab", "combine-lab", "lock-closed"].includes(key)) return;
    node.style.opacity = "0";
  });
}

export async function mountBlueprint(root) {
  const stage = $("#blueprint-stage", root) || root;
  const res = await fetch("blueprint.svg");
  stage.innerHTML = await res.text();
  const svg = $("svg", stage);
  setupInk(svg);

  const pathOut = $("#path-out", svg);
  const pathBack = $("#path-back", svg);
  const pathBt = $("#path-bt", svg);
  const pathCloud = $("#path-cloud", svg);
  const grainPath = $("#grain-path", svg);
  const pktOut = $("#pkt-out", svg);
  const pktBack = $("#pkt-back", svg);
  const pktBt = $("#pkt-bt", svg);
  const pktCloud = $("#pkt-cloud", svg);
  const tap = $("#tap", svg);

  ["path-out", "path-back", "path-bt", "path-cloud"].forEach((id) => {
    const el = $("#" + id, svg);
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.dataset.len = String(len);
  });

  const kickerEl = $("#storyKicker");
  const titleEl = $("#storyTitle");
  const textEl = $("#storyText");
  const stepsEl = $("#storySteps");
  const barEl = $("#storyBar");

  BEATS.forEach((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(i + 1).padStart(2, "0");
    b.addEventListener("click", () => {
      const track = $(".story-track");
      if (!track) return;
      const start = track.getBoundingClientRect().top + window.scrollY - 8;
      const p = (i + 0.15) / BEATS.length;
      window.scrollTo({ top: start + p * (track.offsetHeight - window.innerHeight), behavior: "smooth" });
    });
    stepsEl.appendChild(b);
  });

  let current = -1;
  function setCaption(i) {
    if (i === current) return;
    current = i;
    const beat = BEATS[i];
    kickerEl.textContent = beat.kicker;
    titleEl.textContent = beat.title;
    textEl.textContent = beat.text;
    [...stepsEl.children].forEach((btn, n) => btn.classList.toggle("on", n === i));
  }

  function apply(p) {
    barEl.style.width = `${p * 100}%`;
    const idx = Math.min(BEATS.length - 1, Math.floor(p * BEATS.length + 1e-6));
    setCaption(idx);

    paintInk(svg, "ground", range(p, 0.0, 0.04));
    fade(svg, "title", range(p, 0.0, 0.03));
    fade(svg, "ground-lab", range(p, 0.03, 0.06));

    paintInk(svg, "kamaz", range(p, 0.02, 0.12));
    fade(svg, "kamaz-lab", range(p, 0.08, 0.13));

    paintInk(svg, "combine", range(p, 0.1, 0.2));
    paintInk(svg, "auger", range(p, 0.16, 0.22));
    paintInk(svg, "terminal", range(p, 0.18, 0.24));
    fade(svg, "combine-lab", range(p, 0.18, 0.23));
    fade(svg, "term-lab", range(p, 0.2, 0.26));
    fade(svg, "lock-closed", range(p, 0.2, 0.26) * (1 - range(p, 0.72, 0.76)));
    fade(svg, "lock-open", range(p, 0.74, 0.8));

    paintInk(svg, "phone-c", range(p, 0.22, 0.28));
    paintInk(svg, "phone-k", range(p, 0.22, 0.28));
    fade(svg, "phone-c-lab", range(p, 0.24, 0.3));
    fade(svg, "phone-k-lab", range(p, 0.24, 0.3));
    fade(svg, "ui-c-idle", range(p, 0.26, 0.3) * (1 - range(p, 0.3, 0.34)));
    fade(svg, "ui-k-idle", range(p, 0.26, 0.3) * (1 - range(p, 0.42, 0.46)));

    fade(svg, "ui-c-send", range(p, 0.3, 0.35) * (1 - range(p, 0.58, 0.64)));
    fade(svg, "lab-out", range(p, 0.32, 0.36) * (1 - range(p, 0.46, 0.5)));

    const outT = range(p, 0.34, 0.45);
    if (pathOut) {
      pathOut.style.strokeDashoffset = String(Number(pathOut.dataset.len) * (1 - outT));
      pathOut.style.opacity = String(outT > 0 && outT < 1 ? 0.9 : outT >= 1 ? 0.25 : 0);
    }
    place(pktOut, pathOut, outT, outT > 0.02 && outT < 0.98);

    fade(svg, "ui-k-note", range(p, 0.44, 0.5) * (1 - range(p, 0.56, 0.62)));
    fade(svg, "tap", range(p, 0.5, 0.54) * (1 - range(p, 0.56, 0.6)));
    if (tap) {
      const t = range(p, 0.5, 0.57);
      const x = 1048 + 7 + 32;
      const y = 78 + 18 + 79;
      tap.setAttribute("transform", `translate(${x} ${y}) scale(${0.85 + t * 0.4})`);
    }

    fade(svg, "ui-k-ok", range(p, 0.56, 0.62));
    fade(svg, "lab-back", range(p, 0.58, 0.63) * (1 - range(p, 0.7, 0.74)));

    const backT = range(p, 0.58, 0.68);
    if (pathBack) {
      pathBack.style.strokeDashoffset = String(Number(pathBack.dataset.len) * (1 - backT));
      pathBack.style.opacity = String(backT > 0 && backT < 1 ? 0.9 : backT >= 1 ? 0.25 : 0);
    }
    place(pktBack, pathBack, backT, backT > 0.02 && backT < 0.98);

    fade(svg, "ui-c-ok", range(p, 0.66, 0.72));
    fade(svg, "lab-bt", range(p, 0.68, 0.73) * (1 - range(p, 0.8, 0.84)));
    fade(svg, "bt-waves", range(p, 0.68, 0.74) * (1 - range(p, 0.8, 0.86)));

    const btT = range(p, 0.68, 0.76);
    if (pathBt) {
      pathBt.style.strokeDashoffset = String(Number(pathBt.dataset.len) * (1 - btT));
      pathBt.style.opacity = String(btT > 0 ? 0.85 : 0);
    }
    place(pktBt, pathBt, btT, btT > 0.02 && btT < 0.98);
    $$(".led", svg).forEach((el) => {
      el.style.fill = btT > 0.85 ? "#22d3ee" : "transparent";
      el.style.filter = btT > 0.85 ? "url(#bp-glow)" : "none";
    });

    fade(svg, "grain", range(p, 0.76, 0.82));
    if (grainPath) {
      const glen = grainPath.getTotalLength();
      const time = performance.now() / 900;
      $$(".grain-dot", svg).forEach((dot, i) => {
        const base = Number(dot.dataset.along || 0);
        const u = (base + time * 0.15 + i * 0.02) % 1;
        const pt = grainPath.getPointAtLength(u * glen);
        const show = range(p, 0.76, 0.82);
        dot.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        dot.style.opacity = String(show);
      });
    }

    fade(svg, "offline-lab", range(p, 0.8, 0.86) * (1 - range(p, 0.88, 0.92)));
    paintInk(svg, "cloud", range(p, 0.84, 0.9));
    const cloudT = range(p, 0.86, 0.93);
    fade(svg, "wifi-lab", cloudT);
    if (pathCloud) {
      pathCloud.style.strokeDashoffset = String(Number(pathCloud.dataset.len) * (1 - cloudT));
      pathCloud.style.opacity = String(cloudT > 0 ? 0.8 : 0);
    }
    place(pktCloud, pathCloud, cloudT, cloudT > 0.05 && cloudT < 0.98);

    paintInk(svg, "weigh", range(p, 0.9, 0.98));
    fade(svg, "weigh-lab", range(p, 0.92, 0.98));
  }

  let last = 0;
  let frozen = false;
  function onScroll() {
    if (frozen) return;
    const track = $(".story-track");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const total = Math.max(1, track.offsetHeight - window.innerHeight);
    const scrolled = clamp(-rect.top, 0, total);
    last = scrolled / total;
    apply(last);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  const params = new URLSearchParams(location.search);
  const preview = params.get("preview");
  if (preview !== null) {
    frozen = true;
    document.body.classList.add("preview");
    const i = clamp(Number(preview) || 0, 0, BEATS.length - 1);
    const p = (i + 0.55) / BEATS.length;
    apply(p);
  } else {
    apply(0);
    onScroll();
  }

  function loop() {
    if (!frozen && last > 0.74 && last < 0.9) apply(last);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { apply, BEATS };
}
