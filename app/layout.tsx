import type { ReactNode } from 'react';

/**
 * Root layout. The <html> element is created in the [locale] layout so that
 * lang/dir can be set per locale (next-intl pattern).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
