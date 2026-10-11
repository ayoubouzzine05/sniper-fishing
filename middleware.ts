import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except static assets, PWA files and the locale-free
  // /offline fallback page used by the service worker.
  matcher: ['/((?!api|_next|_vercel|offline|manifest\\.webmanifest|sw\\.js|icons/|logo\\.svg|apple-icon|favicon|robots\\.txt|.*\\..*).*)']
};
