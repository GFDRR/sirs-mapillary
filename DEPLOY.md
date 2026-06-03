# Deploying the public build

This app shows Mapillary street-level coverage of schools. For a public deploy
two things must be true:

1. Only open data is published (OpenStreetMap school points + the aggregate
   coverage summary). The Giga-derived files are gitignored and are never
   loaded by the app.
2. The Mapillary access token is never in the browser. A small Cloudflare
   Worker proxies Mapillary requests and adds the token server-side.

Follow the three parts below in order.

## Part A - Deploy the Cloudflare Worker (token proxy)

The Worker lives in `proxy/`. It forwards:

- `/tiles/...` to `https://tiles.mapillary.com/...`
- `/graph/...` to `https://graph.mapillary.com/...`

and injects the access token from a Worker secret.

1. Install Wrangler if you do not have it:

   ```
   npm install -g wrangler
   ```

2. Log in to Cloudflare:

   ```
   wrangler login
   ```

3. From the `proxy/` directory, set the token as a secret (you will be
   prompted to paste the `MLY|...` token):

   ```
   cd proxy
   wrangler secret put MAPILLARY_TOKEN
   ```

4. Deploy the Worker:

   ```
   wrangler deploy
   ```

   Wrangler prints the Worker URL, for example:

   ```
   https://sirs-mapillary-proxy.<your-account>.workers.dev
   ```

   Copy that URL - it is your proxy base. Quick check (should return tile
   bytes or a Mapillary JSON error, not an auth error about a missing token):

   ```
   curl -I "https://sirs-mapillary-proxy.<your-account>.workers.dev/graph/123?fields=thumb_256_url"
   ```

## Part B - Create the public config (proxy base, no token)

The app reads `config.js`. For the public build it must set the proxy base and
must NOT contain the token. Create a `config.js` next to `index.html` with a
single line:

```
window.MLY_PROXY_BASE = "https://your-worker.workers.dev";
```

`config.js` is gitignored, so it is not committed - you add it at publish time
(see Part C).

For local development instead, create `config.js` with your token, and the app
talks to Mapillary directly:

```
window.MAPILLARY_TOKEN = "MLY|your|token";
```

## Part C - Publish to GitHub Pages

GitHub Pages serves static files, so you publish `index.html`, the `data/`
directory (open files only), and the proxy-mode `config.js`.

1. Confirm the Giga-derived files are gitignored and untracked:

   ```
   git status --ignored
   git ls-files data/
   ```

   `git ls-files data/` must list only the OSM layers
   (`schools_*_osm.geojson`, `schools_GHA.geojson`) and
   `coverage_summary.json`. It must NOT list `schools_NER.geojson`,
   `schools_GIN.geojson`, `schools_MLI.geojson`, `schools_BEN.geojson`,
   `sampled_coverage.geojson`, or `school_counts_reconciliation.*`.

2. Generate the proxy-mode `config.js` (Part B).

3. Publish. Either:

   - Enable Pages on the repo (Settings -> Pages -> deploy from a branch),
     and make sure the published branch includes `index.html`, the open
     `data/` files, and the proxy-mode `config.js`. Because `config.js` is
     gitignored, add it explicitly for the Pages deploy, for example with a
     deploy action that writes it from a `MLY_PROXY_BASE` repo variable, or
     by force-adding it to the Pages branch only:

     ```
     git add -f config.js
     ```

   - Or use a Pages action that writes `config.js` from an `MLY_PROXY_BASE`
     repo variable, then uploads the site.

4. Open the published URL and confirm:

   - School points load (OpenStreetMap).
   - Mapillary blue sequence lines appear when you zoom into a town.
   - In the browser dev tools Network tab, Mapillary requests go to your
     Worker URL (`/tiles/...`, `/graph/...`) and the token does not appear
     anywhere in the page source or requests.

## Summary - what each build loads

- Public build: OSM school layers + `coverage_summary.json`; Mapillary via the
  Worker proxy; no token in the browser.
- Local build: same OSM layers + summary; Mapillary direct using the local
  token from `config.js`.
