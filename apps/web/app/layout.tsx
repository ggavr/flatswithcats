import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cats & Flats',
  description: 'Общая платформа для опекунов котов и обмена жильём'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div style={{ minHeight: '100vh' }}>{children}</div>
      </body>
    </html>
  );
}
