'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/20/solid';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const allItems = [
    { label: 'Home', href: '/dashboard' },
    ...items
  ];

  return (
    <nav aria-label="Breadcrumb" className={`flex ${className}`}>
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon 
                  className="flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-500 mx-2" 
                  aria-hidden="true"
                />
              )}
              
              {isFirst ? (
                <>
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
                      aria-label="Go to home"
                    >
                      <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </Link>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      <HomeIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </span>
                  )}
                </>
              ) : (
                <>
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span 
                      className="text-sm font-medium text-gray-900 dark:text-gray-100"
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;