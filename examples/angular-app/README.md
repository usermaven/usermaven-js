# Angular + Usermaven

Lightweight Angular example that wires `@usermaven/sdk-js` via a service so you can verify events, identities, and attributes.

## Setup

1. From repo root, install deps for this example: `pnpm install --filter @example/angular`
2. Update `trackingHost` and `key` inside `src/app/usermaven.service.ts`.
3. Start the dev server: `pnpm --filter @example/angular start` (runs `ng serve`).

## What it sends

- `pageview` on load (`ngOnInit` in `AppComponent`)
- `id` with sample user properties when you click **Identify user**
- `track('button_click')` when you click **Track button click**

Open DevTools → Network and filter for your tracking host (e.g., `events.usermaven.com`) to inspect payloads.
