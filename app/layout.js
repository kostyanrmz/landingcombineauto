import "../styles.css";

export const metadata = {
  title: "Combine Auto — система «свой / чужой» на уборке",
  description:
    "Зерно уезжает только на подтверждённую технику. Обмен по Wi‑Fi между телефонами, Bluetooth к GPS-терминалу, автоприём у перевозчика, QR рейса на весовой.",
  openGraph: {
    title: "Combine Auto — система «свой / чужой» на уборке",
    description:
      "Контроль выгрузки: перевозчик подтверждает приём и разблокирует шнек. Работа в поле без интернета.",
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
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
