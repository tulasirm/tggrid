/**
 * Cloudflare Worker for Static Asset Optimization
 * Optimizes and caches static assets (images, fonts, CSS, JS)
 */

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const cache = caches.default;

  // Check if asset is in cache
  let response = await cache.match(request);

  if (!response) {
    // Fetch from origin
    response = await fetch(request);

    // Clone response for caching
    const newResponse = new Response(response.body, response);

    // Set cache headers based on file type
    const headers = new Headers(newResponse.headers);

    if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      // Images - cache for 1 year
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Content-Type", getContentType(url.pathname));
    } else if (url.pathname.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
      // Fonts - cache for 1 year
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Content-Type", "font/" + url.pathname.split(".").pop());
    } else if (url.pathname.match(/\.(css|js)$/i)) {
      // CSS/JS - cache for 1 year (Next.js adds hash to filenames)
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }

    // Add security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Enable compression
    headers.set("Content-Encoding", "br");

    const cachedResponse = new Response(newResponse.body, {
      status: newResponse.status,
      statusText: newResponse.statusText,
      headers: headers,
    });

    // Cache the response
    event.waitUntil(cache.put(request, cachedResponse.clone()));

    return cachedResponse;
  }

  return response;
}

function getContentType(pathname) {
  const ext = pathname.split(".").pop().toLowerCase();
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  return types[ext] || "application/octet-stream";
}
