# sirs-mapillary

A lightweight web map showing where **Mapillary street-level photos** already exist near schools, for the School Infrastructure Risk Screening (SIRS) work across five West African countries: Niger, Mali, Guinea, Benin, Ghana.

The goal is to assess whether free, existing street-level imagery can help read building characteristics (roof, height, structural type) from the ground - before commissioning any new photo collection.

## What it shows

- **Coverage**: how much of each country's school network has nearby Mapillary photos, and how recent they are.
- **Photos**: click a covered school to see the most useful nearby images (camera-facing-the-school first), and open a panoramic viewer.

School locations shown are from **OpenStreetMap** (open data, ODbL). Street-level imagery is from **Mapillary**.

## Run locally

It is a single static page - no build step.

```sh
# Optional: for the photo layers, provide a Mapillary token
cp .env.example .env   # then add your MAPILLARY_TOKEN

python3 -m http.server 8765
# open http://localhost:8765/
```

## Deploy (public)

For a public deployment the Mapillary token must not sit in the browser. A small
Cloudflare Worker proxy holds the token server-side. See **[`DEPLOY.md`](DEPLOY.md)**
for the full steps (deploy the worker, set the proxy base, publish to GitHub Pages).

## Data + licenses

- School points: © OpenStreetMap contributors, **ODbL 1.0**.
- Street-level imagery: **Mapillary** (CC-BY-SA).
- Coverage figures in `data/coverage_summary.json` are aggregate, country-level only.

## AI-assisted development

> This project was developed with significant assistance from AI coding tools.

- **[Claude Code](https://claude.ai/claude-code)** (Anthropic) - code generation, architecture, and documentation.
- All functionality has been tested and verified to work as intended.
- Features and infrastructure choices have been reviewed and approved by the maintainer.
