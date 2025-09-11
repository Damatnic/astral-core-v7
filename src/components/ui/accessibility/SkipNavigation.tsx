'use client';

/**
 * SkipNavigation Component
 * Provides skip links for keyboard navigation and accessibility
 */

import React from 'react';
import { SkipLink } from './VisuallyHidden';
import { clsx } from 'clsx';

interface SkipNavigationProps {
  /**
   * Array of skip link targets
   */
  links?: Array<{
    href: string;
    label: string;
  }> | undefined;
  /**
   * Additional class names
   */
  className?: string | undefined;
}

const defaultLinks = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#search', label: 'Skip to search' },
  { href: '#footer', label: 'Skip to footer' }
];

export function SkipNavigation({ 
  links = defaultLinks, 
  className = '',
  ...props 
}: SkipNavigationProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={clsx('skip-navigation', className)}
      {...props}
    >
      {links.map(({ href, label }) => (
        <SkipLink
          key={href}
          href={href}
          className="focus:z-[10000]" // Ensure skip links appear above everything
        >
          {label}
        </SkipLink>
      ))}
    </div>
  );
}

/**
 * Main content wrapper with proper skip target
 */
export function MainContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      id="main-content"
      tabIndex={-1} // Allow programmatic focus
      className={clsx(
        'focus:outline-none', // Remove focus outline since this is just a scroll target
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}

/**
 * Navigation wrapper with proper skip target
 */
export function Navigation({
  children,
  className,
  'aria-label': ariaLabel = 'Main navigation',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      id="navigation"
      tabIndex={-1}
      aria-label={ariaLabel}
      className={clsx(
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

/**
 * Search wrapper with proper skip target
 */
export function SearchArea({
  children,
  className,
  'aria-label': ariaLabel = 'Search',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <div
      id="search"
      tabIndex={-1}
      role="search"
      aria-label={ariaLabel}
      className={clsx(
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Footer wrapper with proper skip target
 */
export function Footer({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <footer
      id="footer"
      tabIndex={-1}
      className={clsx(
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </footer>
  );
}

/**
 * Mental health specific skip navigation
 * Includes crisis support and wellness quick access
 */
export function MentalHealthSkipNavigation({
  className,
  ...props
}: {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const mentalHealthLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#crisis-support', label: 'Skip to crisis support' },
    { href: '#wellness-dashboard', label: 'Skip to wellness dashboard' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#emergency-contacts', label: 'Skip to emergency contacts' }
  ];

  return (
    <SkipNavigation
      links={mentalHealthLinks}
      className={className}
      {...props}
    />
  );
}

/**
 * Crisis support area wrapper
 */
export function CrisisSupportArea({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      id="crisis-support"
      tabIndex={-1}
      aria-label="Crisis support resources"
      className={clsx(
        'focus:outline-none',
        // Visual styling for crisis area
        'bg-red-50 border-l-4 border-red-400 p-4 mb-4',
        'dark:bg-red-900/20 dark:border-red-400',
        className
      )}
      {...props}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Wellness dashboard area wrapper
 */
export function WellnessDashboardArea({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      id="wellness-dashboard"
      tabIndex={-1}
      aria-label="Wellness dashboard"
      className={clsx(
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export default SkipNavigation;