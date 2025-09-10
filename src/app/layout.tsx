import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Astral Core - Mental Health Platform',
  description: 'Secure HIPAA-compliant mental health platform providing therapy, wellness tracking, and crisis support services.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
          .sr-only:focus {
            position: static;
            width: auto;
            height: auto;
            padding: 1rem;
            margin: 0;
            overflow: visible;
            clip: auto;
            white-space: normal;
            background: #2563eb;
            color: white;
            z-index: 9999;
          }
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white">
          Skip to main content
        </a>
        <div id="main-content">
          {children}
        </div>
        <div id="announcements" aria-live="polite" aria-atomic="true" className="sr-only"></div>
      </body>
    </html>
  );
}
