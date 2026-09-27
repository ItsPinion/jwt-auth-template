import { createHash } from "node:crypto";

/**
 * Human-friendly landing page for GET / — API overview, interactive health
 * check, and copy-pasteable examples.
 *
 * Fully self-contained: CSS and JS are inlined into the document (the script
 * is allow-listed by an exact CSP sha256 hash, see app.ts). External
 * /assets/* routes proved fragile in the wild (browsers heuristic-cache
 * function responses, and content blockers may reject subresources), so the
 * page has no subresource requests at all.
 */

export interface HomePageOptions {
  /** NODE_ENV-ish label shown on the page. */
  environment: string;
}

export function renderHomePage(opts: HomePageOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JWT Auth Template API</title>
<meta name="description" content="Production-ready JWT authentication API: register, login, rotating refresh tokens, and protected routes.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%236366f1'/%3E%3Cpath d='M16 7a4 4 0 0 1 4 4v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1v-2a4 4 0 0 1 4-4zm0 2.5A1.5 1.5 0 0 0 14.5 11v2h3v-2A1.5 1.5 0 0 0 16 9.5z' fill='white'/%3E%3C/svg%3E">
<style>${HOME_CSS}</style>
</head>
<body>
<nav class="nav">
  <a class="brand" href="/">
    <span class="brand-mark" aria-hidden="true">🔐</span>
    <span>jwt-auth-template</span>
    <span class="pill pill-api">API</span>
  </a>
  <div class="nav-links">
    <a href="/health">/health</a>
    <a href="https://github.com/ItsPinion/jwt-auth-template" rel="noopener">GitHub ↗</a>
  </div>
</nav>

<header class="hero">
  <div class="hero-inner">
    <p class="eyebrow">Authentication microservice · ready to deploy</p>
    <h1>JWT Auth Template <span class="grad">API</span></h1>
    <p class="lede">
      Email + password accounts with short-lived access tokens and rotating
      refresh-token cookies. Validated with Zod, hardened with Helmet, and
      rate-limited per IP. Point your frontend at this URL and go.
    </p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#getting-started">Quick start</a>
      <a class="btn" href="#reference">API reference</a>
    </div>
    <div class="base-row">
      <span class="base-label">Base URL</span>
      <code class="base-url" id="base-url"></code>
      <button class="copy" data-copy-from="base-url" title="Copy base URL">Copy</button>
    </div>
  </div>
</header>

<section class="strip">
  <div class="strip-inner">
    <div class="stat"><span class="stat-k">Status</span><span class="stat-v"><span class="dot" id="status-dot"></span><span id="status-text">checking…</span></span></div>
    <div class="stat"><span class="stat-k">Environment</span><span class="stat-v">${escapeHtml(opts.environment)}</span></div>
    <div class="stat"><span class="stat-k">Access token</span><span class="stat-v">15&nbsp;min · Bearer</span></div>
    <div class="stat"><span class="stat-k">Refresh token</span><span class="stat-v">httpOnly cookie · rotating</span></div>
    <button class="btn btn-small" id="health-btn" title="GET /health">Run health check</button>
  </div>
  <div class="strip-inner health-result" id="health-result" hidden></div>
</section>

<section class="section" id="getting-started">
  <h2><span class="stepno">1</span> Quick start</h2>
  <p class="muted">Four calls from zero to a protected route. Every response uses the
  same envelope: <code>{"success":…, "message":…, "data":…}</code>.</p>

  <div class="step">
    <h3>Create an account</h3>
    <p class="muted">Returns a fresh access token and sets the refresh cookie. Password rules: 8–72 characters, not a common password.</p>
    ${curlBlock(`curl -i -X POST "$BASE/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"a-strong-passphrase"}'`)}
  </div>

  <div class="step">
    <h3>Sign in</h3>
    <p class="muted">Same shape as register. The refresh token travels as an httpOnly cookie (<code>${"__Host-refreshToken"}</code> in production), so browsers manage it for you — just send <code>credentials: 'include'</code>.</p>
    ${curlBlock(`curl -i -X POST "$BASE/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"a-strong-passphrase"}'`)}
  </div>

  <div class="step">
    <h3>Call a protected route</h3>
    <p class="muted">Send the access token as a Bearer header.</p>
    ${curlBlock(`curl -i "$BASE/auth/me" \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`)}
  </div>

  <div class="step">
    <h3>Refresh &amp; sign out</h3>
    <p class="muted">When the access token expires, swap the refresh cookie for a new one (it rotates on every use). Sign out revokes the session; <code>logout-all</code> requires a valid access token and kills every session for the user.</p>
    ${curlBlock(`curl -i -X POST "$BASE/auth/refresh" \\
  -H "Cookie: __Host-refreshToken=$REFRESH_COOKIE"

curl -i -X POST "$BASE/auth/logout"`)}
  </div>
</section>

<section class="section" id="reference">
  <h2><span class="stepno">2</span> API reference</h2>
  <p class="muted">All routes also answer under <code>/api/*</code> (e.g. <code>/api/auth/login</code>) — useful behind same-origin proxies. Rate limits are per IP per 15-minute window.</p>
  <div class="cards">
    ${endpointCard({ method: "GET", path: "/health", auth: "public", limit: "—", desc: "Liveness probe. Returns {\"status\":\"ok\"} with no dependencies — safe for uptime monitors.", example: `200 OK\n{ "status": "ok" }` })}
    ${endpointCard({ method: "POST", path: "/auth/register", auth: "public", limit: "20 req", desc: "Create an account. Validates the email and password policy, hashes with bcrypt, returns an access token and sets the refresh cookie.", example: `201 Created\n{ "success": true, "message": "User registered successfully",\n  "data": { "accessToken": "eyJhbGciOi…" } }` })}
    ${endpointCard({ method: "POST", path: "/auth/login", auth: "public", limit: "20 req", desc: "Exchange credentials for tokens. Identical response shape to register.", example: `200 OK\n{ "success": true, "message": "Login successful",\n  "data": { "accessToken": "eyJhbGciOi…" } }` })}
    ${endpointCard({ method: "POST", path: "/auth/refresh", auth: "refresh cookie", limit: "120 req", desc: "Rotate the session: validates the refresh cookie (token family + reuse detection), issues a new access token and a new refresh cookie.", example: `200 OK\n{ "success": true, "message": "Refresh successful",\n  "data": { "accessToken": "eyJhbGciOi…" } }` })}
    ${endpointCard({ method: "POST", path: "/auth/logout", auth: "refresh cookie", limit: "120 req", desc: "Revoke the current session and clear the refresh cookie. Idempotent — safe to call on every sign-out.", example: `200 OK\n{ "success": true, "message": "Logout successful", "data": null }` })}
    ${endpointCard({ method: "POST", path: "/auth/logout-all", auth: "Bearer", limit: "120 req", desc: "Revoke every refresh token for the user (all devices) and clear this cookie.", example: `200 OK\n{ "success": true, "message": "Signed out of all sessions", "data": null }` })}
    ${endpointCard({ method: "GET", path: "/auth/me", auth: "Bearer", limit: "—", desc: "Current user profile, read fresh from the database so role changes apply before the token expires.", example: `200 OK\n{ "success": true, "message": "User fetched successfully",\n  "data": { "user": { "id": "…", "email": "you@example.com", "role": "user" } } }` })}
    ${endpointCard({ method: "GET", path: "/", auth: "public", limit: "—", desc: "This page — human-readable docs, also mirrored at /api.", example: `200 OK · text/html` })}
  </div>
</section>

<section class="section" id="conventions">
  <h2><span class="stepno">3</span> Conventions &amp; hardening</h2>
  <div class="grid2">
    <div class="note-card">
      <h3>Response envelope</h3>
      <p class="muted">Success and failure share a shape your client can parse once:</p>
      ${codeBlock(`{ "success": true,  "message": "…", "data": { … } }
{ "success": false, "message": "Unauthorized", "data": null }`, false)}
    </div>
    <div class="note-card">
      <h3>Token model</h3>
      <ul class="muted">
        <li><strong>Access token</strong> — 15&nbsp;min JWT, sent as <code>Authorization: Bearer …</code>. Never stored in <code>localStorage</code> by this API — your choice on the client.</li>
        <li><strong>Refresh token</strong> — httpOnly + Secure + SameSite=Lax cookie, rotated on every refresh with reuse detection (a stolen old token kills the whole family).</li>
        <li>Secrets come from <code>ACCESS_TOKEN_SECRET</code> / <code>REFRESH_SECRET</code>; generate with <code>openssl rand -hex 32</code>.</li>
      </ul>
    </div>
    <div class="note-card">
      <h3>Validation &amp; security</h3>
      <ul class="muted">
        <li>Zod schemas reject bad input with field-level messages (400).</li>
        <li>Helmet sets CSP, <code>X-Frame-Options</code>, <code>X-Content-Type-Options</code>, and friends.</li>
        <li>CORS is restricted to <code>CLIENT_URL</code> (default <code>http://localhost:3000</code>) with credentials.</li>
        <li>bcrypt password hashing; login timing is uniform for unknown emails.</li>
      </ul>
    </div>
    <div class="note-card">
      <h3>Rate limits <span class="muted small">(per IP / 15 min)</span></h3>
      <table class="limits">
        <tr><td><code>POST /auth/register</code> · <code>POST /auth/login</code></td><td>20</td></tr>
        <tr><td><code>POST /auth/refresh</code> · <code>logout</code> · <code>logout-all</code></td><td>120</td></tr>
        <tr><td>everything else</td><td>—</td></tr>
      </table>
      <p class="muted">On 429, back off until the window resets — credential endpoints are deliberately strict because each attempt costs a bcrypt round.</p>
    </div>
  </div>
</section>

<footer class="footer">
  <p>
    Built with Express 5 · Bun · TypeScript · Drizzle ORM · Neon Postgres · Zod —
    <a href="https://github.com/ItsPinion/jwt-auth-template" rel="noopener">ItsPinion/jwt-auth-template</a>
  </p>
  <p class="muted small">Self-host anywhere Node runs; on Vercel this API deploys as a single function.</p>
</footer>

<script>${HOME_JS}</script>
</body>
</html>`;
}

function curlBlock(curl: string): string {
  return codeBlock(curl, true);
}

function codeBlock(code: string, copyable: boolean): string {
  return `<div class="code-wrap"><pre><code>${escapeHtml(code)}</code></pre>${
    copyable ? `<button class="copy" data-copy>Copy</button>` : ""
  }</div>`;
}

interface EndpointCardInput {
  method: "GET" | "POST";
  path: string;
  auth: string;
  limit: string;
  desc: string;
  example: string;
}

function endpointCard(e: EndpointCardInput): string {
  const authClass =
    e.auth === "public" ? "pill-public" : e.auth === "Bearer" ? "pill-bearer" : "pill-cookie";
  return `<article class="card">
    <header class="card-head">
      <span class="method method-${e.method.toLowerCase()}">${e.method}</span>
      <code class="card-path">${escapeHtml(e.path)}</code>
    </header>
    <p class="muted">${escapeHtml(e.desc)}</p>
    <div class="card-meta">
      <span class="pill ${authClass}">${escapeHtml(e.auth)}</span>
      ${e.limit === "—" ? "" : `<span class="pill pill-limit">${escapeHtml(e.limit)} / 15 min</span>`}
    </div>
    <pre class="example"><code>${escapeHtml(e.example)}</code></pre>
  </article>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const HOME_CSS = `/* landing page — served from /assets/home.css */
:root {
  --bg: #0b0d12; --panel: #11141b; --panel-2: #161a23;
  --text: #e7eaf0; --muted: #93a0b4; --line: rgba(255, 255, 255, 0.09);
  --indigo: #6366f1; --cyan: #22d3ee; --green: #34d399; --amber: #fbbf24;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a { color: var(--cyan); text-decoration: none; }
a:hover { text-decoration: underline; }
.muted { color: var(--muted); }
.small { font-size: 0.85em; }

.nav {
  position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px; background: rgba(11, 13, 18, 0.85); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 10px; color: var(--text); font-weight: 650; }
.brand:hover { text-decoration: none; }
.brand-mark { font-size: 18px; }
.nav-links { display: flex; gap: 20px; font-size: 14.5px; }

.pill {
  display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px;
  font-size: 11.5px; font-weight: 650; letter-spacing: 0.02em; text-transform: uppercase;
  border: 1px solid var(--line); color: var(--muted);
}
.pill-api { background: rgba(99, 102, 241, 0.18); color: #a5b4fc; border-color: rgba(99, 102, 241, 0.4); }
.pill-public { background: rgba(52, 211, 153, 0.12); color: var(--green); border-color: rgba(52, 211, 153, 0.35); }
.pill-bearer { background: rgba(99, 102, 241, 0.14); color: #a5b4fc; border-color: rgba(99, 102, 241, 0.35); }
.pill-cookie { background: rgba(251, 191, 36, 0.12); color: var(--amber); border-color: rgba(251, 191, 36, 0.35); }
.pill-limit { background: rgba(255, 255, 255, 0.05); }

.hero { background: radial-gradient(1000px 420px at 75% -10%, rgba(99, 102, 241, 0.22), transparent 60%),
                    radial-gradient(800px 380px at 10% 110%, rgba(34, 211, 238, 0.12), transparent 55%); }
.hero-inner { max-width: 980px; margin: 0 auto; padding: 72px 28px 56px; }
.eyebrow { color: var(--muted); text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; font-weight: 650; }
h1 { font-size: clamp(34px, 6vw, 54px); line-height: 1.1; margin: 8px 0 16px; letter-spacing: -0.02em; }
.grad {
  background: linear-gradient(90deg, var(--indigo), var(--cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.lede { font-size: 18px; color: var(--muted); max-width: 680px; margin: 0 0 28px; }
.hero-actions { display: flex; gap: 12px; margin-bottom: 34px; }
.btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--panel); color: var(--text); font-weight: 600;
  font-size: 14.5px; cursor: pointer;
}
.btn:hover { border-color: rgba(255, 255, 255, 0.25); text-decoration: none; }
.btn-primary { background: linear-gradient(90deg, var(--indigo), #4f46e5); border-color: transparent; }
.btn-small { padding: 6px 12px; font-size: 13px; }

.base-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.base-label { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
.base-url {
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 9px 14px; font-size: 14.5px; color: var(--cyan);
}
.copy {
  padding: 8px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2);
  color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer;
}
.copy:hover { color: var(--text); border-color: rgba(255, 255, 255, 0.25); }

.strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, 0.02); }
.strip-inner {
  max-width: 980px; margin: 0 auto; padding: 18px 28px; display: flex; gap: 34px;
  align-items: center; flex-wrap: wrap;
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-k { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.stat-v { font-weight: 600; display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); display: inline-block; }
.dot.ok { background: var(--green); box-shadow: 0 0 8px rgba(52, 211, 153, 0.8); }
.dot.bad { background: #f87171; box-shadow: 0 0 8px rgba(248, 113, 113, 0.8); }
.health-result { padding-top: 0; font-size: 14px; color: var(--muted); }

.section { max-width: 980px; margin: 0 auto; padding: 56px 28px 8px; }
h2 { font-size: 26px; letter-spacing: -0.01em; display: flex; align-items: center; gap: 12px; }
.stepno {
  display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px;
  border-radius: 9px; background: rgba(99, 102, 241, 0.18); color: #a5b4fc; font-size: 15px;
}
.step { margin: 28px 0 8px; }
.step h3 { margin: 0 0 6px; font-size: 17.5px; }

.code-wrap { position: relative; margin: 12px 0 20px; }
pre {
  margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 16px 18px; overflow-x: auto; font-size: 13.5px; line-height: 1.55; color: #c9d4e4;
}
.code-wrap .copy { position: absolute; top: 10px; right: 10px; padding: 5px 11px; font-size: 12px; }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(430px, 1fr)); gap: 18px; margin-top: 26px; }
.card {
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 12px;
}
.card-head { display: flex; align-items: center; gap: 12px; }
.method {
  font-size: 11.5px; font-weight: 750; letter-spacing: 0.05em; padding: 3px 10px; border-radius: 7px;
}
.method-get { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
.method-post { background: rgba(34, 197, 94, 0.16); color: #86efac; }
.card-path { font-size: 16px; font-weight: 650; color: var(--text); }
.card p { margin: 0; font-size: 14.5px; }
.card-meta { display: flex; gap: 8px; }
.example { font-size: 12.5px; background: var(--panel-2); }

.grid2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 18px; margin-top: 26px; }
.note-card {
  background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 22px 24px;
}
.note-card h3 { margin: 0 0 10px; font-size: 16.5px; }
.note-card ul { margin: 0; padding-left: 18px; display: grid; gap: 8px; font-size: 14.5px; }
.limits { width: 100%; border-collapse: collapse; font-size: 14px; }
.limits td { padding: 8px 4px; border-bottom: 1px solid var(--line); }
.limits td:last-child { text-align: right; font-weight: 700; color: var(--cyan); }

.footer { text-align: center; padding: 56px 28px 48px; margin-top: 40px; border-top: 1px solid var(--line); }
.footer p { margin: 4px 0; }

@media (max-width: 720px) {
  .cards, .grid2 { grid-template-columns: 1fr; }
  .strip-inner { gap: 18px; }
  .nav { padding: 12px 16px; }
  .hero-inner { padding: 48px 16px 40px; }
  .section { padding: 40px 16px 8px; }
}
`;

export const HOME_JS = `// landing page — served from /assets/home.js
(function () {
  "use strict";

  // Base URL box + copy buttons
  var base = location.origin;
  var baseUrlEl = document.getElementById("base-url");
  if (baseUrlEl) baseUrlEl.textContent = base;

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      var old = btn.textContent;
      btn.textContent = "Copied ✓";
      setTimeout(function () { btn.textContent = old; }, 1200);
    });
  }

  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var from = btn.getAttribute("data-copy-from");
      if (from) {
        var el = document.getElementById(from);
        if (el) copyText(el.textContent, btn);
        return;
      }
      var wrap = btn.closest(".code-wrap");
      var code = wrap && wrap.querySelector("code");
      if (code) copyText(code.textContent.replace(/\\$BASE/g, base), btn);
    });
  });

  // Substitute $BASE inside code samples so copies are runnable
  document.querySelectorAll(".code-wrap code").forEach(function (el) {
    el.textContent = el.textContent.replace(/\\$BASE/g, base);
  });

  // Interactive health check
  var dot = document.getElementById("status-dot");
  var text = document.getElementById("status-text");
  var result = document.getElementById("health-result");
  var btn = document.getElementById("health-btn");

  function runHealth() {
    if (text) text.textContent = "checking…";
    if (dot) dot.className = "dot";
    var started = performance.now();
    fetch(base + "/health", { cache: "no-store" })
      .then(function (res) {
        return res.json().then(function (body) {
          var ms = Math.round(performance.now() - started);
          var ok = res.ok && body && body.status === "ok";
          if (dot) dot.className = "dot " + (ok ? "ok" : "bad");
          if (text) text.textContent = ok ? "operational" : "degraded";
          if (result) {
            result.hidden = false;
            result.textContent =
              "GET /health → " + res.status + " in " + ms + "ms — " + JSON.stringify(body);
          }
        });
      })
      .catch(function (err) {
        if (dot) dot.className = "dot bad";
        if (text) text.textContent = "unreachable";
        if (result) {
          result.hidden = false;
          result.textContent = "GET /health failed: " + err.message;
        }
      });
  }

  if (btn) btn.addEventListener("click", runHealth);
  runHealth();
})();
`;

/**
 * CSP script-src hash for the exact inline script body above. The / route sets
 * this on its own Content-Security-Policy header so the inline script runs
 * without 'unsafe-inline'.
 */
export const HOME_SCRIPT_CSP_HASH =
  "sha256-" + createHash("sha256").update(HOME_JS).digest("base64");
