import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import ConfigGate from '@/components/ConfigGate';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });

export const metadata: Metadata = {
  title: 'Reminder inteligent',
  description: 'Remindere inteligente pentru familie, fara stres.',
  manifest: '/manifest.json'
};

export const viewport = {
  themeColor: '#1f2937'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro" className={spaceGrotesk.variable}>
      <body className="min-h-screen font-sans">
        <ConfigGate>{children}</ConfigGate>
      </body>
    </html>
  );
}
