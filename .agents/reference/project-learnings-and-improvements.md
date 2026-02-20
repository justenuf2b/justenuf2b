# Project Learnings and Improvements

**Purpose:** Capture learnings, insights, and improvement opportunities discovered during implementation. Organized by issue number. Reviewed at session start to avoid repeating mistakes and ensure smooth handoffs.

---

## Issue #1 — Deploy meet.justenuf2b.com to Cloudflare Pages

**Status:** Complete

### Learnings

1. **Cloudflare Pages project names matching zone names can intercept custom domain routing.** A Pages project named `justenuf2b` on the zone `justenuf2b.com` caused all subdomain traffic to route to the wrong project, even when custom domains were explicitly configured on a different project (`justenuf2bmeet`). Deleting the conflicting project resolved the issue.

2. **Cloudflare Worker routes take priority over Pages custom domains.** A Worker route for `meet.justenuf2b.com/*` intercepted all traffic before it could reach the Pages project. Check Worker routes when debugging Pages custom domain 404s.

3. **Compare response headers to identify what's serving traffic.** Pages responses include `access-control-allow-origin`, `cache-control`, and `etag` headers. Worker responses have different security headers (`X-Frame-Options`, etc.). Header comparison quickly identifies whether traffic is reaching Pages or being intercepted.

4. **Cloudflare Workers: Save vs Deploy are separate actions.** Clicking "Save" in the Worker editor does NOT deploy. You must explicitly click "Deploy" for the new code to go live. The `/_version` endpoint pattern is useful for confirming deployments.

### Process Improvements Identified

1. **Added `/_version` endpoint pattern** — Returns JSON with worker name, version, purpose, and routes. Enables quick deployment verification without checking the dashboard.

### Follow-on Work Identified

None.

### User-Level Improvements (Bubble Up)

1. **Cloudflare Pages debugging checklist** — When a custom domain returns 404 but pages.dev works: (1) Check for Worker routes intercepting traffic, (2) Check for conflicting Pages projects with matching zone names, (3) Compare response headers to identify serving layer. Could be added to a Cloudflare troubleshooting reference doc.
