# Persona Lab API

The backend for the Persona Lab simulator (`persona-simulator.html`). It serves the anchor data and runs the incentive model. Zero dependencies, Node 18 or later.

## Run

```bash
node ai-growth-Tripadvisor/backend/server.js
# open http://127.0.0.1:8787/persona-simulator.html
```

Environment variables: `PORT` (default `8787`), `HOST` (default `127.0.0.1`).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness and data version |
| GET | `/api/anchors` | Observed cells, market and segment metadata, input limits, defaults |
| POST | `/api/simulate` | Scenario in, dashboard payload out |

`POST /api/simulate` takes a JSON body. Every field is optional and falls back to the defaults in the anchors file.

```json
{ "market": "UK", "segment": "first", "offer": "pct", "depth": 15,
  "voucher": 15, "audience": 10000, "margin": 0.22, "beta": 0.6, "gamma": 0.12 }
```

Unknown markets or segments fall back to the defaults. Numbers are clamped to the slider limits. The response includes `scenario` (the selected cell), `baseline` (flat 15%), `curve` (net revenue at each depth from 0% to 30%), `personas` (all five markets), and `grid` (every market and segment).

## Where the data lives

- `ai-growth-Tripadvisor/assets/persona-anchors.json` holds the observed case-study cells and segment factors, the same figures as section 5 of `docs/persona-simulator-prd.md`. The public page uses only these figures. Internal warehouse data is never read here.
- `ai-growth-Tripadvisor/assets/persona-model.js` holds the model. The browser and the server load this same file, so the numbers match.

## Test

```bash
node --test ai-growth-Tripadvisor/backend/test/persona-api.test.js
```

## Deploy

Any Node host works (Render, Fly.io, Railway, a VM). Start the process with `node ai-growth-Tripadvisor/backend/server.js` and set `HOST=0.0.0.0` and `PORT` as the host requires. The static page is served from the same process, so the page and the API share an origin.

To point a page hosted elsewhere (such as the GitHub Pages copy) at a remote API, set the meta tag in `persona-simulator.html`:

```html
<meta name="persona-api" content="https://your-api.example.com/api" />
```

The API sends `Access-Control-Allow-Origin: *`, so cross-origin reads work. When no API answers, the page runs the same model in the browser and the header badge says so.
