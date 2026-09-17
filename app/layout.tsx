import type { Metadata } from 'next';
import './globals.css';
import './flow.css';
import './spacing.css';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'رِحلة | تعلّم العربية بذكاء',
  description: 'نظام ذكي تكيّفي لتعلّم اللغة العربية',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
