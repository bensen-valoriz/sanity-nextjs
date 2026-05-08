// ============================================================================
// Hardened Cloudflare Worker — Site Proxy with Security Best Practices
// ============================================================================

// ── HTTP status codes ────────────────────────────────────────────────────────
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
};

// ── Cache durations (seconds) ────────────────────────────────────────────────
const CACHE_TTL = {
  HTML: 300,
  ASSET: 86_400,
  ASSET_SWR: 3600,
  STATIC: 2_592_000,
  DEFAULT: 3600,
  HSTS_DURATION: 63_072_000,
};

// ── Top-level regex constants ────────────────────────────────────────────────
const RE_PATH_TRAVERSAL = /\.\./;
const RE_SOURCE_MAP = /\.map$/i;
const RE_MIME_EXT = /\.[a-z0-9]+$/i;
const RE_JS_CSS = /\.(js|css)$/;
const RE_STATIC_ASSETS = /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot)$/;
const RE_SITE_ID = /^[a-zA-Z0-9_-]+$/;
const RE_WWW_PREFIX = /^www\./;
const RE_TRAILING_SLASH = /\/$/;
const RE_HOSTNAME = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$/i;

// ── MIME type map (avoid relying on upstream Content-Type) ──────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

// ── Path traversal / poison patterns ────────────────────────────────────────
const BLOCKED_SEGMENTS = new Set([
  ".env",
  ".git",
  ".svn",
  ".htaccess",
  ".htpasswd",
  ".ds_store",
  "thumbs.db",
  "web.config",
  "package.json",
  "package-lock.json",
  "node_modules",
  "composer.json",
  "wp-config.php",
  ".well-known",
]);

const BLOCKED_PATH_PATTERNS = [RE_PATH_TRAVERSAL, RE_SOURCE_MAP];

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePath(rawPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (decoded.includes("\0")) {
    return null;
  }

  try {
    const resolved = new URL(decoded, "https://dummy").pathname;
    if (!resolved.startsWith("/")) {
      return null;
    }

    for (const pattern of BLOCKED_PATH_PATTERNS) {
      if (pattern.test(resolved)) {
        return null;
      }
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
  const ext = (path.match(RE_MIME_EXT) ?? [""])[0].toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
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

function buildBlobUrl(env, siteId, path) {
  const decodedPath = decodeURIComponent(path);
  return `${env.SAS_URL}/${siteId}${decodedPath}?${env.SAS_TOKEN}`;
}

function applySecurityHeaders(response, path) {
  const headers = new Headers(response.headers);
  const mimeType = getMimeType(path);
  const isHtml = mimeType.startsWith("text/html");

  headers.set("Content-Type", mimeType);
  headers.set("Cache-Control", getCacheControl(path));

  if (isHtml) {
    headers.delete("Access-Control-Allow-Origin");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Strict-Transport-Security",
    `max-age=${CACHE_TTL.HSTS_DURATION}; includeSubDomains; preload`,
  );
  headers.delete("Server");
  headers.delete("X-Powered-By");
  headers.delete("X-AspNet-Version");

  if (isHtml) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self' https:",
        "script-src 'self' https: 'unsafe-inline'",
        "style-src 'self' https: 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https:",
        "connect-src 'self' https:",
        "media-src 'self' blob: mediastream: https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "upgrade-insecure-requests",
      ].join("; "),
    );

    headers.delete("Content-Security-Policy-Report-Only");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("X-XSS-Protection", "0");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function resolveSiteId(kvDetails, normalizedHostname) {
  let parsed;
  try {
    parsed = JSON.parse(kvDetails);
  } catch {
    console.error("Malformed KV entry for hostname:", normalizedHostname);
    return null;
  }

  const siteId = parsed?.siteId;
  if (!siteId) {
    console.error("Missing siteId for hostname:", normalizedHostname);
    return null;
  }

  if (!RE_SITE_ID.test(siteId)) {
    console.error("Invalid siteId format:", siteId);
    return null;
  }

  return siteId;
}

function buildAttemptPaths(sanitizedPath) {
  const resolvedPath =
    sanitizedPath === "/" || sanitizedPath === "" ? "/index.html" : sanitizedPath;

  const hasTrailingSlash = resolvedPath.endsWith("/");
  const cleanPath = resolvedPath.replace(RE_TRAILING_SLASH, "");

  if (resolvedPath === "/index.html") {
    return ["/index.html"];
  }
  if (hasTrailingSlash) {
    return [`${cleanPath}/index.html`, `${cleanPath}.html`];
  }
  if (!cleanPath.includes(".")) {
    return [`${cleanPath}.html`, `${cleanPath}/index.html`, cleanPath];
  }
  return [cleanPath];
}

// ── Main Worker ─────────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: HTTP_STATUS.METHOD_NOT_ALLOWED,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(req.url);
    const hostname = url.hostname;
    const searchHostname = url.searchParams.get("h") ?? hostname;

    if (!searchHostname?.match(RE_HOSTNAME)) {
      return new Response("Invalid hostname", { status: HTTP_STATUS.BAD_REQUEST });
    }

    const normalizedHostname = searchHostname.replace(RE_WWW_PREFIX, "");

    let kvDetails = await env.STREAK_KV.get(normalizedHostname);

    if (!kvDetails) {
      if (searchHostname.startsWith("www.")) {
        kvDetails = await env.STREAK_KV.get(searchHostname);
      } else {
        kvDetails = await env.STREAK_KV.get(`www.${normalizedHostname}`);
      }
    }

    if (!kvDetails) {
      return new Response("Site not found", { status: HTTP_STATUS.NOT_FOUND });
    }

    const siteId = resolveSiteId(kvDetails, normalizedHostname);
    if (!siteId) {
      return new Response("Internal Server Error", {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      });
    }

    const sanitizedPath = sanitizePath(url.pathname);
    if (!sanitizedPath) {
      return new Response("Forbidden", { status: HTTP_STATUS.FORBIDDEN });
    }

    const attempts = buildAttemptPaths(sanitizedPath);

    for (const attemptPath of attempts) {
      const blobUrl = buildBlobUrl(env, siteId, attemptPath);
      const blobResponse = await fetch(blobUrl);

      if (blobResponse.ok) {
        return applySecurityHeaders(blobResponse, attemptPath);
      }
    }

    return new Response("Page not found", {
      status: HTTP_STATUS.NOT_FOUND,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};
