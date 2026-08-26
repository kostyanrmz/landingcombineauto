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
      { threshold: 0.1 }
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
      <div className="site-atmosphere" aria-hidden="true" />

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
          <a href="#process" className="nav-link">
            Процесс
          </a>
          <a href="#roles" className="nav-link">
            Роли
          </a>
          <a href="#advantages" className="nav-link">
            В поле
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
        <a href="#process" className="nav-link" onClick={() => setMenuOpen(false)}>
          Процесс
        </a>
        <a href="#roles" className="nav-link" onClick={() => setMenuOpen(false)}>
          Роли
        </a>
        <a href="#advantages" className="nav-link" onClick={() => setMenuOpen(false)}>
          В поле
        </a>
        <a href="#contact" className="nav-link" onClick={() => setMenuOpen(false)}>
          Контакт
        </a>
        <div className="mobile-menu-actions">
          <a href="#contact" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
            Оставить заявку
          </a>
        </div>
      </div>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy">
            <p className="hero-brand-line">Combine Auto</p>
            <h1>
              Система «свой / чужой»
              <br />
              <span className="gradient-text">на уборке зерна</span>
            </h1>
            <p className="lead">
              Комбайн выгружает только на подтверждённую машину. Перевозчик и бункер-перегрузчик — в одной цепочке. На весовой рейс открывается по QR.
            </p>
            <div className="hero-cta">
              <a href="#story" className="btn btn-primary">
                Смотреть цепочку
              </a>
              <a href="#contact" className="btn btn-glass">
                Написать
              </a>
            </div>
          </div>
          <div className="hero-media reveal" aria-hidden="true">
            <img src="/assets/hero-field.jpg" alt="" />
          </div>
        </section>

        <section className="container pitch" aria-label="Что это">
          <div className="pitch-grid">
            <article className="pitch-item reveal">
              <span className="pitch-n">01</span>
              <h3>Контроль выгрузки</h3>
              <p>Шнек открывается, когда перевозчик подтвердил приём — зерно фиксируется за ним.</p>
            </article>
            <article className="pitch-item reveal">
              <span className="pitch-n">02</span>
              <h3>Wi‑Fi рядом, без интернета</h3>
              <p>Телефоны обмениваются данными по локальному Wi‑Fi. Мобильный интернет в поле не нужен.</p>
            </article>
            <article className="pitch-item reveal">
              <span className="pitch-n">03</span>
              <h3>Рейс на весовой</h3>
              <p>Перевозчик показывает QR всей поездки — вес сходится с тем, что ушло с поля.</p>
            </article>
          </div>
        </section>

        <StorySection />

        <section className="container" id="process">
          <div className="section-head reveal">
            <p className="eyebrow">Процесс</p>
            <h2>Как взаимодействуют комбайн, бункер и перевозчик</h2>
            <p className="section-desc">
              Простые шаги снаружи. Правила внутри не дают зерну уехать «мимо учёта».
            </p>
          </div>

          <ol className="process-steps">
            <li className="process-step reveal">
              <span className="process-idx">1</span>
              <div>
                <h3>Комбайнёр ищет рядом</h3>
                <p>
                  Нужна выгрузка — в приложении видны ближайшие перевозчики и бункеры-перегрузчики. Указывается заполненность бункера, уходит запрос по Wi‑Fi между телефонами.
                </p>
              </div>
            </li>
            <li className="process-step reveal">
              <span className="process-idx">2</span>
              <div>
                <h3>Приём — вручную или автоприём</h3>
                <p>
                  Перевозчик (или оператор бункера) принимает запрос. Можно включить автоприём: подходящие запросы принимаются сами, без лишних нажатий в кабине.
                </p>
              </div>
            </li>
            <li className="process-step reveal">
              <span className="process-idx">3</span>
              <div>
                <h3>Шнек разблокирует перевозчик</h3>
                <p>
                  Разблокировать шнек может водитель-перевозчик. Тем самым он подтверждает: зерно уходит именно ему. Команда на GPS-терминал комбайна уходит по Bluetooth. Пока подтверждения нет — зерно физически не уйдёт.
                </p>
              </div>
            </li>
            <li className="process-step reveal">
              <span className="process-idx">4</span>
              <div>
                <h3>Бункер — звено между полем и током</h3>
                <p>
                  Бункер-перегрузчик принимает с комбайна, копит объём и сам ищет перевозчика, чтобы отдать зерно дальше. Те же запросы и подтверждения — зерно не «теряется» между машинами.
                </p>
              </div>
            </li>
            <li className="process-step reveal">
              <span className="process-idx">5</span>
              <div>
                <h3>Рейс перевозчика</h3>
                <p>
                  Перевозчик может набрать несколько погрузок по пути на ток. На весовой — один QR на весь рейс, не каждую выгрузку по отдельности.
                </p>
              </div>
            </li>
            <li className="process-step reveal">
              <span className="process-idx">6</span>
              <div>
                <h3>Данные доходят, когда есть сеть</h3>
                <p>
                  В поле интернет не обязателен. Когда связь появилась — операции поднимаются в веб-кабинет хозяйства: кто у кого загрузился и что прошло весовую.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="container" id="roles">
          <div className="section-head center reveal">
            <p className="eyebrow">Роли</p>
            <h2>Три полевые роли — одна цепочка</h2>
            <p className="section-desc">Каждый делает свою часть. Вместе — путь зерна с поля до весовой.</p>
          </div>
          <div className="roles-grid">
            <article className="role-card reveal">
              <div className="role-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="8" width="13" height="8" rx="1.5" />
                  <path d="M16 11h4l1 3v2h-5M6 16v2M14 16v2M4 8V6h8" />
                </svg>
              </div>
              <h3>Комбайнёр</h3>
              <p>
                Находит рядом перевозчика или бункер, шлёт запрос на выгрузку. Шнек на комбайне открывается только после подтверждения приёма.
              </p>
            </article>
            <article className="role-card reveal">
              <div className="role-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 16V8h11l4 4v4H3z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="16" cy="17" r="2" />
                </svg>
              </div>
              <h3>Перевозчик</h3>
              <p>
                Принимает зерно с комбайна или бункера — вручную или через автоприём. Разблокируя шнек, фиксирует: зерно едет с ним. На току — QR рейса.
              </p>
            </article>
            <article className="role-card reveal">
              <div className="role-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 20V8l8-4 8 4v12" />
                  <path d="M9 20v-6h6v6" />
                </svg>
              </div>
              <h3>Бункер-перегрузчик</h3>
              <p>
                Промежуточный склад на поле: принял с комбайна — отдал перевозчику. Два направления одной роли, тот же контроль «свой / чужой».
              </p>
            </article>
          </div>
        </section>

        <section className="container" id="advantages">
          <div className="section-head reveal">
            <p className="eyebrow">В поле</p>
            <h2>Как это держится без интернета</h2>
            <p className="section-desc">
              Рядом договорились по Wi‑Fi, шнек открыли после подтверждения перевозчика, учёт сохранился на телефоне — в кабинет ушло, когда сеть появилась.
            </p>
          </div>

          <div className="adv-layout">
            <div className="adv-list">
              <article className="adv-item reveal">
                <h3>Обмен по Wi‑Fi между телефонами</h3>
                <p>
                  Комбайн и перевозчик рядом связываются по локальному Wi‑Fi — без мобильного интернета и без «отправки в облако». Для полевой договорённости сеть оператора не нужна.
                </p>
              </article>
              <article className="adv-item reveal">
                <h3>Шнек — подтверждение перевозчика</h3>
                <p>
                  Разблокировать шнек может водитель. Это не просто «открыть трубу»: он подтверждает, что зерно будет у него. Команда на терминал Navtelecom — по Bluetooth.
                </p>
              </article>
              <article className="adv-item reveal">
                <h3>Автоприём у перевозчика</h3>
                <p>
                  Чтобы не отвлекаться на каждый запрос, у водителей есть автоприём — подходящие заявки принимаются сами.
                </p>
              </article>
              <article className="adv-item reveal">
                <h3>Офлайн и локальный учёт</h3>
                <p>
                  Пока сети нет, операции живут в приложении. Когда связь появилась — данные поднимаются в кабинет хозяйства.
                </p>
              </article>
            </div>

            <figure className="term-figure reveal">
              <img
                src="/assets/navtelecom-signal.png"
                alt="Терминал Navtelecom SIGNAL"
                width="200"
                height="240"
              />
              <figcaption>Navtelecom · Bluetooth · шнек</figcaption>
            </figure>
          </div>
        </section>

        <section className="container" id="contact">
          <div className="contact-wrap">
            <div className="reveal">
              <p className="eyebrow">Связь</p>
              <h2>Напишите, если интересно на уборку</h2>
              <p className="section-desc">
                Приложение на Android, при необходимости — терминалы и обучение комбайнёров с перевозчиками.
              </p>
              <ul className="contact-points">
                <li>Для хозяйств, где уборка — объём, а не одна машина</li>
                <li>Можно стартовать без блокировки шнека</li>
                <li>Автоприём у перевозчиков уже в приложении</li>
              </ul>
              <a
                className="wa-btn"
                href="https://wa.me/77085474323?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D0%B5%D1%82%20Combine%20Auto"
                target="_blank"
                rel="noopener"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.09-1.13l-.3-.18-3 .79.8-2.92-.19-.3A7.93 7.93 0 1 1 12 20z" />
                </svg>
                Написать в WhatsApp
              </a>
            </div>

            <form className="lead-form reveal" onSubmit={onLead}>
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
                Отправить в WhatsApp
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="container">
        <div className="footer-copy">© 2026 Combine Auto</div>
        <div className="footer-links">
          <a href="https://wa.me/77085474323" target="_blank" rel="noopener">
            WhatsApp
          </a>
          <a href="mailto:clackrmz@gmail.com">Почта</a>
        </div>
      </footer>
    </>
  );
}
