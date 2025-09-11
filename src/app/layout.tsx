import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MentalHealthSkipNavigation, MainContent } from '@/components/ui/accessibility';
import { ThemeProvider } from '@/providers/ThemeProvider';
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
  description:
    'Secure HIPAA-compliant mental health platform providing therapy, wellness tracking, and crisis support services.',
  keywords: 'mental health, therapy, wellness, crisis support, HIPAA compliant, accessibility',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4A90E2' },
    { media: '(prefers-color-scheme: dark)', color: '#6BB6FF' }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' dir='ltr'>
      <head>
        <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover' />
        <meta name='color-scheme' content='light dark' />
        <meta name='theme-color' content='#4A90E2' media='(prefers-color-scheme: light)' />
        <meta name='theme-color' content='#6BB6FF' media='(prefers-color-scheme: dark)' />
        
        {/* Accessibility meta tags */}
        <meta name='format-detection' content='telephone=no' />
        <meta name='msapplication-tap-highlight' content='no' />
        
        {/* PWA Manifest */}
        <link rel='manifest' href='/manifest.json' />
        
        {/* iOS PWA Meta Tags */}
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Astral Core' />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        
        {/* Preload critical fonts */}
        <link
          rel='preload'
          href='/fonts/geist-sans.woff2'
          as='font'
          type='font/woff2'
          crossOrigin='anonymous'
        />
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          defaultTheme="system"
          attribute="data-theme"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          {/* Mental Health Skip Navigation */}
          <MentalHealthSkipNavigation />

          {/* Error Boundary with enhanced accessibility */}
          <ErrorBoundary
          fallback={
            <div 
              className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'
              role='main'
              aria-labelledby='error-heading'
            >
              <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                  <div className='text-center'>
                    <h1 
                      id='error-heading' 
                      className='text-2xl font-bold text-gray-900 mb-2'
                    >
                      Application Error
                    </h1>
                    <p className='text-gray-600 mb-4'>
                      We apologize for the inconvenience. The application has encountered an unexpected error.
                    </p>
                    <p className='text-sm text-gray-500 mb-6'>
                      Your data is safe. Please refresh the page or contact support if the issue persists.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]'
                      aria-describedby='refresh-help'
                    >
                      Refresh Page
                    </button>
                    <p id='refresh-help' className='sr-only'>
                      This will reload the application and may resolve the error
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <MainContent>
            {children}
          </MainContent>
        </ErrorBoundary>

        {/* Enhanced live region for announcements */}
        <div 
          id='announcements' 
          aria-live='polite' 
          aria-atomic='true' 
          className='sr-only'
          role='log'
          aria-label='Status announcements'
        ></div>
        
        {/* Additional live region for urgent announcements */}
        <div 
          id='urgent-announcements' 
          aria-live='assertive' 
          aria-atomic='true' 
          className='sr-only'
          role='alert'
          aria-label='Urgent announcements'
        ></div>

        {/* Crisis support hotline (always available) */}
        <div className='sr-only'>
          <p>
            Crisis support is available 24/7. Press Escape key for immediate access to emergency resources, 
            or call 988 for the Suicide & Crisis Lifeline.
          </p>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
