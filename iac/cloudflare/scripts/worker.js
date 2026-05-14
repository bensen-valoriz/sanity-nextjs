// ============================================================================

// ── HTTP Status Codes ────────────────────────────────────────────────────────
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
};

// ── Cache Durations (seconds) ────────────────────────────────────────────────
const CACHE_TTL = {
  HTML: 300,
  ASSET: 86_400,
  ASSET_SWR: 3600,
  STATIC: 2_592_000,
  DEFAULT: 3600,
  HSTS_DURATION: 63_072_000,
};

// ── Regex ────────────────────────────────────────────────────────────────────
const RE_PATH_TRAVERSAL = /\.\./;
const RE_SOURCE_MAP = /\.map$/i;
const RE_MIME_EXT = /\.[a-z0-9]+$/i;
const RE_JS_CSS = /\.(js|css)$/i;

const RE_STATIC_ASSETS =
  /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|mp4|webm|mp3|ogg)$/i;

// ── MIME Types ───────────────────────────────────────────────────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",

  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",

  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",

  ".pdf": "application/pdf",

  ".mp4": "video/mp4",
  ".webm": "video/webm",

  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

// ── Blocked Paths / Sensitive Files ──────────────────────────────────────────
const BLOCKED_SEGMENTS = new Set([
  ".env",
  ".git",
  ".svn",
  ".htaccess",
  ".htpasswd",
  ".ds_store",
  "thumbs.db",
  "web.config",
  "node_modules",
  "package.json",
  "package-lock.json",
  "composer.json",
  ".well-known",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizePath(rawPath) {
  try {
    const decoded = decodeURIComponent(rawPath);

    if (decoded.includes("\0")) {
      return null;
    }

    const resolved = new URL(decoded, "https://dummy").pathname;

    if (!resolved.startsWith("/")) {
      return null;
    }

    if (
      RE_PATH_TRAVERSAL.test(resolved) ||
      RE_SOURCE_MAP.test(resolved)
    ) {
      return null;
    }

    const segments = resolved.split("/").filter(Boolean);

    for (const segment of segments) {
      if (BLOCKED_SEGMENTS.has(segment.toLowerCase())) {
        return null;
      }
    }

    return resolved;
  } catch {
    return null;
  }
}

function getMimeType(path) {
  const ext = (path.match(RE_MIME_EXT) || [""])[0].toLowerCase();

  return MIME_TYPES[ext] || "application/octet-stream";
}

function getCacheControl(path) {
  if (path.endsWith(".html") || path === "/") {
    return `public, max-age=${CACHE_TTL.HTML}, must-revalidate`;
  }

  if (RE_JS_CSS.test(path)) {
    return `public, max-age=${CACHE_TTL.ASSET}, stale-while-revalidate=${CACHE_TTL.ASSET_SWR}`;
  }

  if (RE_STATIC_ASSETS.test(path)) {
    return `public, max-age=${CACHE_TTL.STATIC}, immutable`;
  }

  return `public, max-age=${CACHE_TTL.DEFAULT}`;
}

function applyHeaders(response, path) {
  const headers = new Headers(response.headers);

  const mimeType = getMimeType(path);
  const isHtml = mimeType.startsWith("text/html");

  // ── Core Headers ──────────────────────────────────────────────────────────

  headers.set("Content-Type", mimeType);
  headers.set("Cache-Control", getCacheControl(path));

  // ── Security Headers ──────────────────────────────────────────────────────

  headers.set("X-Content-Type-Options", "nosniff");

  headers.set(
    "Strict-Transport-Security",
    `max-age=${CACHE_TTL.HSTS_DURATION}; includeSubDomains; preload`
  );

  headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  headers.set("X-Frame-Options", "SAMEORIGIN");

  headers.set("X-XSS-Protection", "0");

  // ── Remove Fingerprinting Headers ────────────────────────────────────────

  headers.delete("Server");
  headers.delete("X-Powered-By");
  headers.delete("X-AspNet-Version");

  // ── Content Security Policy ──────────────────────────────────────────────

  if (isHtml) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self' https:",
        "script-src 'self' https: 'unsafe-inline'",
        "style-src 'self' https: 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https:",
        "media-src 'self' blob: mediastream: https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "upgrade-insecure-requests",
      ].join("; ")
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Routing ──────────────────────────────────────────────────────────────────

function buildAttemptPaths(path) {
  if (path === "/") {
    return ["/index.html"];
  }

  if (path.endsWith("/")) {
    return [
      `${path}index.html`,
      `${path.slice(0, -1)}.html`,
    ];
  }

  if (!path.includes(".")) {
    return [
      `${path}.html`,
      `${path}/index.html`,
    ];
  }

  return [path];
}

// ── R2 Fetch ────────────────────────────────────────────────────────────────

async function getFromR2(env, path) {
  const key = `out${path}`;

  return await env.BUCKET.get(key);
}

// ── Worker ──────────────────────────────────────────────────────────────────

export default {
  async fetch(req, env) {

    // ── Method Validation ───────────────────────────────────────────────────

    if (!["GET", "HEAD"].includes(req.method)) {
      return new Response("Method Not Allowed", {
        status: HTTP_STATUS.METHOD_NOT_ALLOWED,
        headers: {
          Allow: "GET, HEAD",
        },
      });
    }

    try {

      const url = new URL(req.url);

      // ── Path Sanitization ─────────────────────────────────────────────────

      const path = sanitizePath(url.pathname);

      if (!path) {
        return new Response("Forbidden", {
          status: HTTP_STATUS.FORBIDDEN,
        });
      }

      // ── Route Resolution ──────────────────────────────────────────────────

      const attempts = buildAttemptPaths(path);

      // ── Try All Candidate Paths ───────────────────────────────────────────

      for (const attemptPath of attempts) {

        const object = await getFromR2(env, attemptPath);

        if (object) {

          const response = new Response(
            req.method === "HEAD" ? null : object.body,
            {
              status: 200,
            }
          );

          return applyHeaders(response, attemptPath);
        }
      }

      // ── 404 Page Fallback ────────────────────────────────────────────────

      const page404 = await getFromR2(env, "/404.html");

      if (page404) {

        return applyHeaders(
          new Response(
            req.method === "HEAD" ? null : page404.body,
            {
              status: HTTP_STATUS.NOT_FOUND,
            }
          ),
          "/404.html"
        );
      }

      // ── Default 404 ──────────────────────────────────────────────────────

      return new Response("Not Found", {
        status: HTTP_STATUS.NOT_FOUND,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });

    } catch (err) {

      console.error("Worker Error:", err);

      return new Response("Internal Server Error", {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  },
};