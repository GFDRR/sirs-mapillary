// Cloudflare Worker - Mapillary token proxy for the SIRS Mapillary webmap.
//
// Why: the public build must never ship the Mapillary access token to the
// browser. This Worker holds the token as a secret (env.MAPILLARY_TOKEN) and
// injects it into every upstream request, so the client only ever talks to
// this Worker.
//
// Routing:
//   /tiles/<path...>  ->  https://tiles.mapillary.com/<path...>
//   /graph/<path...>  ->  https://graph.mapillary.com/<path...>
// The access_token query param is appended to every upstream request. Any
// query params the client sent (e.g. ?fields=thumb_256_url) are preserved.
//
// CORS: permissive (any origin) so it can be called from GitHub Pages or any
// preview host. Tighten ALLOW_ORIGIN below if you want to lock it to one site.
//
// Set the secret once with:   wrangler secret put MAPILLARY_TOKEN

const ALLOW_ORIGIN = "*";

const UPSTREAMS = {
  tiles: "https://tiles.mapillary.com",
  graph: "https://graph.mapillary.com",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405, headers: corsHeaders() });
    }

    const token = env.MAPILLARY_TOKEN;
    if (!token) {
      return new Response("proxy misconfigured: MAPILLARY_TOKEN secret not set", {
        status: 500,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    // First path segment selects the upstream; the rest is forwarded as-is.
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const kind = parts.shift(); // 'tiles' or 'graph'
    const base = UPSTREAMS[kind];
    if (!base) {
      return new Response("not found - use /tiles/... or /graph/...", {
        status: 404,
        headers: corsHeaders(),
      });
    }

    const rest = parts.join("/");
    const upstream = new URL(`${base}/${rest}`);
    // Preserve client query params, then force the access token.
    for (const [k, v] of url.searchParams) {
      if (k.toLowerCase() !== "access_token") upstream.searchParams.set(k, v);
    }
    upstream.searchParams.set("access_token", token);

    const upstreamResp = await fetch(upstream.toString(), {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "*/*" },
    });

    // Pass through status + body, add CORS, drop any hop-by-hop headers.
    const headers = new Headers(upstreamResp.headers);
    for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
    headers.delete("set-cookie");

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers,
    });
  },
};
