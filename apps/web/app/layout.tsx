import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cats & Flats',
  description: 'Общая платформа для опекунов котов и обмена жильём'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <div style={{ minHeight: '100vh' }}>{children}</div>
      </body>
    </html>
  );
}
