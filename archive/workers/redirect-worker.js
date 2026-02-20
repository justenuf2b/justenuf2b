// Cloudflare Module Worker — Redirect & Fallback
// Deployed as: worker-justenuf2b-twilight-night-5847
//
// Routes:
//   - justenoughtobe.com/*        → 301 to meet.justenuf2b.com
//   - *.justenoughtobe.com/*      → 301 to meet.justenuf2b.com
//   - www.justenoughtobe.com/*    → 301 to meet.justenuf2b.com
//   - www.justenuf2b.com/*        → 301 to meet.justenuf2b.com
//
// Updated: 2026-02-20 — Simplified after migration to Cloudflare Pages

const WORKER_VERSION = 'redirect-v1-2026-02-20';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const TARGET = 'https://meet.justenuf2b.com';

    // Version check — visit /_version to confirm this code is active
    if (url.pathname === '/_version') {
      return new Response(JSON.stringify({
        worker: 'justenuf2b-redirect',
        version: WORKER_VERSION,
        purpose: 'Redirect old domains to meet.justenuf2b.com',
        routes: [
          'justenoughtobe.com/*',
          '*.justenoughtobe.com/*',
          'www.justenoughtobe.com/*',
          'www.justenuf2b.com/*'
        ]
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Version': WORKER_VERSION
        }
      });
    }

    // Health check
    if (url.pathname === '/_health') {
      return new Response('ok', {
        status: 200,
        headers: { 'X-Worker-Version': WORKER_VERSION }
      });
    }

    // Redirect all known routes to meet.justenuf2b.com
    const host = url.hostname.toLowerCase();
    if (
      host === 'justenoughtobe.com' ||
      host.endsWith('.justenoughtobe.com') ||
      host === 'www.justenuf2b.com'
    ) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': `${TARGET}${url.pathname}${url.search}`,
          'X-Worker-Version': WORKER_VERSION
        }
      });
    }

    // Fallback — if we somehow get traffic we don't expect
    return new Response(fallbackPage(), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Worker-Version': WORKER_VERSION
      }
    });

    function fallbackPage() {
      return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You seem lost</title>
  <style>
    body {
      margin: 0; min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      font: 18px/1.6 system-ui, sans-serif;
      background: #0b0e14; color: #e7e7ea;
    }
    .card {
      text-align: center; padding: 48px; max-width: 480px;
    }
    .emoji { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 12px; color: #77e1b8; }
    p { color: #a6adbb; margin: 0 0 24px; }
    a {
      display: inline-block; padding: 10px 24px;
      background: #77e1b8; color: #0b0e14;
      border-radius: 6px; text-decoration: none;
      font-weight: 600;
    }
    a:hover { background: #5cc89e; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">&#x1F9ED;</div>
    <h1>This page wandered off</h1>
    <p>It probably went to grab coffee. In the meantime, the real site is just one click away.</p>
    <a href="https://meet.justenuf2b.com">Take me there</a>
  </div>
</body>
</html>`;
    }
  }
};
