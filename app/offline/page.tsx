import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline'
};

/**
 * Locale-free fallback page used by the service worker when a navigation
 * fails while offline. Intentionally dependency-free (no next-intl).
 */
export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <title>Offline — Sniper Fishing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:#0b1b2d; color:#e2ebf5; display:flex; align-items:center; justify-content:center; min-height:100vh; }
          .box { text-align:center; padding:2rem; }
          h1 { font-size:1.25rem; margin:0 0 .5rem; }
          p { color:#94b7d9; font-size:.9rem; max-width: 26rem; }
        `}</style>
      </head>
      <body>
        <div className="box">
          <h1>Sniper Fishing</h1>
          <p>
            You are offline. The app shell is cached; live forecasts require a
            connection. Saved spots and your logbook remain available in the
            app.
          </p>
        </div>
      </body>
    </html>
  );
}
