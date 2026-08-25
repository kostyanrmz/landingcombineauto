import "../styles.css";

export const metadata = {
  title: "Combine Auto — учёт зерна на уборке",
  description:
    "Комбайн, КамАЗ и весовая в одной цепочке. Шнек открывается только после подтверждения, работа в поле без интернета, QR рейса на весовой.",
  openGraph: {
    title: "Combine Auto — учёт зерна на уборке",
    description: "Каждая выгрузка фиксируется. Шнек под контролем. Поле работает без сети.",
    locale: "ru_RU",
    type: "website",
    images: ["/assets/hero-field.jpg"],
  },
  icons: {
    icon: "/assets/favicon.png",
    apple: "/assets/logo-mark.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
