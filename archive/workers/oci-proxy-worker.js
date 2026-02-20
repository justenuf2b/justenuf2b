// Cloudflare Module Worker
// Originally deployed as: worker-justenuf2b-twilight-night-5847
//
// Purpose: Served the meet.justenuf2b.com static site from Oracle Cloud
// Infrastructure (OCI) Object Storage via a Pre-Authenticated Request (PAR).
//
// Routes handled:
//   - meet.justenuf2b.com/*
//   - contact.justenuf2b.com/*
//   - www.justenuf2b.com/*
//
// Features:
//   - Proxied static files from OCI bucket "meet-site" (us-ashburn-1 region)
//   - Redirected justenoughtobe.com (all subdomains) → meet.justenuf2b.com
//   - Added security headers (HSTS, X-Frame-Options, CSP, etc.)
//   - Edge caching with 10-minute TTL
//   - Directory index resolution (/ → /index.html)
//   - Friendly 404 and 502 error pages
//
// Retired: 2026-02-20 — OCI hosting replaced by Cloudflare Pages
//   (justenuf2bmeet.pages.dev → meet.justenuf2b.com)

export default {
  async fetch(request, env, ctx) {
    // ====== CONFIG ======
    const ORIGIN = 'https://objectstorage.us-ashburn-1.oraclecloud.com';
    const PAR_PREFIX =
      '/p/zMnhLJ8qakYah7OcziGz4-lw7d86HcCSS2t7XHSZAqaRiH__Sgu0xovwfKAzKHJ3/n/axq8izvrvnvq/b/meet-site/o';
    const EDGE_TTL_SECONDS = 600; // 10 minutes cache
    const REDIRECT_HOST = 'meet.justenuf2b.com';
    const REDIRECT_DOMAIN = 'justenoughtobe.com'; // include subdomains
    // ====================

    try {
      const url = new URL(request.url);

      // Health check
      if (url.pathname === '/_health') {
        return new Response('ok', { status: 200, headers: stdHeaders() });
      }

      // 1) Force HTTPS for all plain HTTP requests
      if (url.protocol === 'http:') {
        // If the request is for justenoughtobe.com, go straight to the HTTPS target host
        if (url.hostname === REDIRECT_DOMAIN || url.hostname.endsWith(`.${REDIRECT_DOMAIN}`)) {
          return Response.redirect(`https://${REDIRECT_HOST}${url.pathname}${url.search}`, 301);
        }
        // Otherwise keep the same host, just upgrade to HTTPS
        return Response.redirect(`https://${url.hostname}${url.pathname}${url.search}`, 301);
      }

      // 2) Host redirect: any justenoughtobe.com host to meet.justenuf2b.com
      if (url.hostname === REDIRECT_DOMAIN || url.hostname.endsWith(`.${REDIRECT_DOMAIN}`)) {
        const location = `https://${REDIRECT_HOST}${url.pathname}${url.search}`;
        return new Response(null, {
          status: 301,
          headers: {
            ...stdHeaders(),
            Location: location,
            'Cache-Control': 'public, max-age=300'
          }
        });
      }

      // Only static-site verbs
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405, headers: stdHeaders() });
      }
      if (request.method === 'OPTIONS') {
        return new Response('', { status: 204, headers: stdHeaders() });
      }

      // Map "/" and any "/dir/" to "/dir/index.html"
      let path = mapToIndex(url.pathname);

      // Try cache first (GET only)
      const cacheKey = new Request(url.origin + path + url.search);
      const cache = caches.default;
      if (request.method === 'GET') {
        const cached = await cache.match(cacheKey);
        if (cached) return addStdHeaders(cached);
      }

      // Fetch primary
      let resp = await fetchFromOrigin(path, url.search, request);

      // 404 → try directory index and site root fallback
      if (resp.status === 404) {
        const fallback = computeFallback(path);
        if (fallback) {
          const alt = await fetchFromOrigin(fallback, url.search, request);
          if (alt.ok) resp = alt;
        }
      }

      // Friendly 404
      if (resp.status === 404) {
        return new Response(notFoundHtml(), {
          status: 404,
          headers: { ...stdHeaders(), 'content-type': 'text/html; charset=utf-8' }
        });
      }

      // Cache successful GETs
      const withHeaders = addStdHeaders(resp);
      if (request.method === 'GET' && resp.ok) {
        const h = new Headers(withHeaders.headers);
        h.set('Cache-Control', `public, max-age=${EDGE_TTL_SECONDS}, s-maxage=${EDGE_TTL_SECONDS}`);
        const cachedResp = new Response(withHeaders.body, {
          status: withHeaders.status,
          statusText: withHeaders.statusText,
          headers: h
        });
        ctx.waitUntil(cache.put(cacheKey, cachedResp.clone()));
        return cachedResp;
      }

      return withHeaders;
    } catch {
      return new Response(errorHtml(), {
        status: 502,
        headers: { ...stdHeaders(), 'content-type': 'text/html; charset=utf-8' }
      });
    }

    // ---- helpers ----
    function mapToIndex(p) {
      if (p === '/' || p.endsWith('/')) return p + (p.endsWith('/') ? '' : '/') + 'index.html';
      return p;
    }

    function computeFallback(p) {
      if (!p.endsWith('/index.html')) {
        if (p.endsWith('/')) return p + 'index.html';
        return p + '/index.html';
      }
      if (p !== '/index.html') return '/index.html';
      return null;
    }

    async function fetchFromOrigin(path, search, req) {
      const upstream = new URL(ORIGIN + PAR_PREFIX + path + search);
      const init = { method: req.method, redirect: 'follow' };
      return fetch(upstream.toString(), init);
    }

    function stdHeaders() {
      return {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cross-Origin-Resource-Policy': 'same-origin'
      };
    }

    function addStdHeaders(resp) {
      const h = new Headers(resp.headers);
      h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      h.set('Referrer-Policy', 'no-referrer');
      h.set('X-Content-Type-Options', 'nosniff');
      h.set('X-Frame-Options', 'DENY');
      h.set('Cross-Origin-Resource-Policy', 'same-origin');
      return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
    }

    function notFoundHtml() {
      return `<!doctype html>
<meta charset="utf-8">
<title>Not Found</title>
<style>body{font:16px system-ui;padding:48px;max-width:720px;margin:auto;line-height:1.5}</style>
<h1>Page not found</h1>
<p>The page you requested doesn't exist.</p>
<p><a href="/">Go to the home page</a></p>`;
    }

    function errorHtml() {
      return `<!doctype html>
<meta charset="utf-8">
<title>Temporary issue</title>
<style>body{font:16px system-ui;padding:48px;max-width:720px;margin:auto;line-height:1.5}</style>
<h1>We're having a little trouble</h1>
<p>We couldn't reach the origin right now. Please try again in a moment.</p>`;
    }
  }
};
