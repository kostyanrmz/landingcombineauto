"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const StorySection = dynamic(() => import("./story/StorySection"), { ssr: false });

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const hamburgerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) setMenuOpen(false);
    };
    const onClick = (e) => {
      if (!menuOpen) return;
      if (menuRef.current?.contains(e.target) || hamburgerRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick);
    };
  }, [menuOpen]);

  useEffect(() => {
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
    return () => obs.disconnect();
  }, []);

  function onLead(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const note = String(fd.get("note") || "").trim();
    const body = `Здравствуйте! Интересует Combine Auto.\nИмя/хозяйство: ${name}\nТелефон: ${phone}${note ? `\nЗадача: ${note}` : ""}`;
    window.open(`https://wa.me/77085474323?text=${encodeURIComponent(body)}`, "_blank");
  }

  return (
    <>
      <div className="bg-glow" aria-hidden="true">
        <span className="g1" />
        <span className="g2" />
        <span className="g3" />
      </div>

      <nav className="navbar" aria-label="Главная навигация">
        <a href="#top" className="nav-logo">
          <img className="nav-logo-mark" src="/assets/logo-mark.png" width="34" height="34" alt="" />
          <span className="nav-logo-text">
            Combine <em>Auto</em>
          </span>
        </a>
        <div className="nav-links">
          <a href="#story" className="nav-link">
            Как работает
          </a>
          <a href="#roles" className="nav-link">
            Роли
          </a>
          <a href="#tech" className="nav-link">
            Связь
          </a>
          <a href="#contact" className="nav-link">
            Контакт
          </a>
        </div>
        <div className="nav-actions">
          <a href="https://wa.me/77085474323" target="_blank" rel="noopener" className="nav-whatsapp">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.09-1.13l-.3-.18-3 .79.8-2.92-.19-.3A7.93 7.93 0 1 1 12 20zm4.4-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
            </svg>
            WhatsApp
          </a>
          <a href="#contact" className="btn btn-primary btn-sm">
            Оставить заявку
          </a>
        </div>
        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          ref={hamburgerRef}
          aria-label="Меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg className="icon-menu" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <svg className="icon-close" viewBox="0 0 24 24" fill="none">
            <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? " open" : ""}`} id="mobileMenu" ref={menuRef}>
        <a href="#story" className="nav-link" onClick={() => setMenuOpen(false)}>
          Как работает
        </a>
        <a href="#roles" className="nav-link" onClick={() => setMenuOpen(false)}>
          Роли
        </a>
        <a href="#tech" className="nav-link" onClick={() => setMenuOpen(false)}>
          Связь
        </a>
        <a href="#contact" className="nav-link" onClick={() => setMenuOpen(false)}>
          Контакт
        </a>
        <div className="mobile-menu-actions">
          <a href="#contact" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
            Оставить заявку
          </a>
          <a href="https://combineautoweb.vercel.app" target="_blank" rel="noopener" className="btn btn-glass">
            Веб-кабинет
          </a>
        </div>
      </div>

      <main id="top">
        <section className="hero container">
          <img className="hero-brand" src="/assets/logo-mark.png" width="88" height="88" alt="Combine Auto" />
          <div className="badge">
            <span className="dot" />
            Уборка урожая · учёт зерна
          </div>
          <h1>
            Зерно с поля до весовой —<br />
            <span className="gradient-text">без серых выгрузок</span>
          </h1>
          <p className="lead">
            Комбайнёр, водитель и бункер работают в одном приложении. Шнек открывается только после подтверждения, в поле не нужен интернет, а на весовой рейс открывается по QR.
          </p>
          <div className="hero-cta">
            <a href="#story" className="btn btn-primary">
              Как это устроено
            </a>
            <a href="https://combineautoweb.vercel.app" target="_blank" rel="noopener" className="btn btn-glass">
              Веб-кабинет
            </a>
          </div>
          <div className="hero-badges">
            <div className="hero-badge-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Android-приложение
            </div>
            <div className="hero-badge-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Полный офлайн в поле
            </div>
            <div className="hero-badge-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Терминалы Navtelecom
            </div>
          </div>
          <div className="hero-visual hero-photo" aria-hidden="true" />
        </section>

        <div className="ticker-section" aria-hidden="true">
          <div className="ticker-track">
            <div className="ticker-item">
              <span className="dot" />
              Выгрузка с комбайна
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Блокировка шнека
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Bluetooth к терминалу
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Связь без интернета
            </div>
            <div className="ticker-item">
              <span className="dot" />
              QR на весовой
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Рейс перевозчика
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Бункер-накопитель
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Кабинет менеджера
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Выгрузка с комбайна
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Блокировка шнека
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Bluetooth к терминалу
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Связь без интернета
            </div>
            <div className="ticker-item">
              <span className="dot" />
              QR на весовой
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Рейс перевозчика
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Бункер-накопитель
            </div>
            <div className="ticker-item">
              <span className="dot" />
              Кабинет менеджера
            </div>
          </div>
        </div>

        <StorySection />

        <section className="container" id="roles">
          <div className="section-head center reveal">
            <p className="eyebrow">Кто в цепочке</p>
            <h2>Три роли в поле, кабинет — в офисе</h2>
            <p className="section-desc">Каждый видит только свою работу. А хозяйство видит всю уборку целиком.</p>
          </div>
          <div className="roles-grid">
            <article className="glass-card role-card reveal">
              <div className="role-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="8" width="13" height="8" rx="1.5" />
                  <path d="M16 11h4l1 3v2h-5M6 16v2M14 16v2M4 8V6h8" />
                </svg>
              </div>
              <h3>Комбайнёр</h3>
              <p>Ищет рядом КамАЗ или бункер, указывает заполненность, отправляет запрос. Если на машине стоит терминал — именно его телефон разблокирует шнек после согласия водителя.</p>
            </article>
            <article className="glass-card role-card reveal">
              <div className="role-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 16V8h11l4 4v4H3z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="16" cy="17" r="2" />
                </svg>
              </div>
              <h3>Перевозчик</h3>
              <p>Принимает зерно в рейс: несколько погрузок по пути на ток. В конце показывает QR поездки на весовой — не каждую выгрузку по отдельности, а весь рейс.</p>
            </article>
            <article className="glass-card role-card reveal">
              <div className="role-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 20V8l8-4 8 4v12" />
                  <path d="M9 20v-6h6v6" />
                </svg>
              </div>
              <h3>Бункер-накопитель</h3>
              <p>Промежуточный склад на поле: принимает с комбайна и отдаёт КамАЗу. Те же подтверждения, тот же учёт — зерно не «теряется» между техникой.</p>
            </article>
          </div>
        </section>

        <section className="container" id="tech">
          <div className="section-head reveal">
            <p className="eyebrow">Простыми словами</p>
            <h2>Как это держится в поле</h2>
            <p className="section-desc">Не набор датчиков «для галочки», а правила, без которых выгрузка просто не состоится.</p>
          </div>
          <div className="stack-grid">
            <div className="tech-list">
              <article className="glass-card tech-item reveal">
                <div className="n">01</div>
                <div>
                  <h3>Шнек как замок</h3>
                  <p>Пока водитель не подтвердил приём, шнек закрыт. Команда уходит на терминал Navtelecom с телефона комбайнёра по Bluetooth. Это не «галочка в журнале» — зерно физически не выгрузится на чужую машину.</p>
                </div>
              </article>
              <article className="glass-card tech-item reveal">
                <div className="n">02</div>
                <div>
                  <h3>Телефоны видят друг друга рядом</h3>
                  <p>Комбайн и КамАЗ договариваются без вышки и без интернета. Связь короткая, как рукопожатие: запрос, ответ, и только потом запись. Повторно ту же выгрузку не создашь.</p>
                </div>
              </article>
              <article className="glass-card tech-item reveal">
                <div className="n">03</div>
                <div>
                  <h3>Сеть появилась — ушло само</h3>
                  <p>В поле всё живёт в телефоне. На току по Wi-Fi или по дороге, когда поймали связь, операции поднимаются в кабинет. Менеджер видит уборку, как только данные дошли.</p>
                </div>
              </article>
              <article className="glass-card tech-item reveal">
                <div className="n">04</div>
                <div>
                  <h3>Весовая сверяет рейс, а не слова</h3>
                  <p>QR на экране водителя открывает поездку со всеми погрузками. Вес на току сходится с тем, что произошло в поле — без бумажек и пересказов.</p>
                </div>
              </article>
            </div>
            <div className="plain-photo reveal field-still">
              <img src="/assets/navtelecom-signal.png" alt="Терминал Navtelecom SIGNAL" />
              <p className="field-still-cap">Navtelecom SIGNAL · GLONASS · шнек</p>
            </div>
          </div>
        </section>

        <section className="container">
          <div className="glass-card web-banner reveal">
            <div>
              <p className="eyebrow">Для хозяйства</p>
              <h2>Кабинет, где уборка видна днём, а не после сезона</h2>
              <p>Рейсы, техника, кто у кого загрузился, что уже прошло весовую. Тот же мир, что в поле, только с экрана офиса.</p>
              <a href="https://combineautoweb.vercel.app" target="_blank" rel="noopener" className="btn btn-primary">
                Открыть веб-кабинет
              </a>
            </div>
            <div className="mock-dash">
              <div className="row">
                <div className="kpi">
                  <small>Сегодня</small>
                  <strong>412 т</strong>
                  <div className="bar">
                    <span />
                  </div>
                </div>
                <div className="kpi">
                  <small>Активны</small>
                  <strong>18</strong>
                  <span>машин в поле</span>
                </div>
              </div>
              <div className="kpi">
                <small>Последние рейсы</small>
                <p style={{ marginTop: 10, color: "var(--text-secondary)", fontSize: ".9rem" }}>КамАЗ 491 · 3 погрузки · на весовой</p>
                <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: ".9rem" }}>Бункер 02 · принял с двух комбайнов</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container" id="contact">
          <div className="contact-wrap">
            <div>
              <p className="eyebrow">Внедрение</p>
              <h2>Поставим на вашу уборку</h2>
              <p className="section-desc">Приложение, терминалы, обучение комбайнёров и водителей, кабинет для агронома и директора.</p>
              <div className="contact-items">
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  Работаем с хозяйствами, где уборка — это объём, а не одна машина
                </div>
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16v12H4z" />
                    <path d="M8 7V5h8v2" />
                  </svg>
                  Режим без замка шнека — если терминала на технике пока нет
                </div>
                <div className="contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 12h16M12 4v16" />
                  </svg>
                  Android сейчас. Кабинет — в браузере
                </div>
              </div>
            </div>

            <form className="glass-card lead-form" onSubmit={onLead}>
              <div className="field">
                <label htmlFor="f-name">Имя или хозяйство</label>
                <input id="f-name" name="name" required placeholder="ТОО «Поле» или Иван" />
              </div>
              <div className="field">
                <label htmlFor="f-phone">Телефон</label>
                <input id="f-phone" name="phone" required placeholder="+7" />
              </div>
              <div className="field">
                <label htmlFor="f-note">Что нужно</label>
                <textarea id="f-note" name="note" rows={3} placeholder="Сколько комбайнов, есть ли Navtelecom, весовая" />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
                Написать в WhatsApp
              </button>
            </form>
          </div>

          <div className="contact-box glass-card reveal" style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3>Или сразу в мессенджер</h3>
              <p style={{ margin: 0 }}>Коротко опишите парк техники — ответим по внедрению.</p>
            </div>
            <a
              className="wa-btn"
              href="https://wa.me/77085474323?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D0%B5%D1%82%20Combine%20Auto"
              target="_blank"
              rel="noopener"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.09-1.13l-.3-.18-3 .79.8-2.92-.19-.3A7.93 7.93 0 1 1 12 20z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="container">
        <div className="footer-copy">
          © 2026 Combine Auto · Syntera
          <span className="footer-credits">
            Комбайн: OwenNielsen · самосвал: Pavel Gorbachev · Sketchfab CC-BY
          </span>
        </div>
        <div className="footer-links">
          <a href="https://combineautoweb.vercel.app" target="_blank" rel="noopener">
            Кабинет
          </a>
          <a href="https://wa.me/77085474323" target="_blank" rel="noopener">
            WhatsApp
          </a>
          <a href="mailto:clackrmz@gmail.com">Почта</a>
        </div>
      </footer>
    </>
  );
}
