# ADR 001: TypeScript headless core and a local Three.js workbench

Status: accepted for the research foundation, reversible at the JSON boundary.

## Decision

Use TypeScript for the first headless cognition/simulation runner and Node.js 24 for the local file bridge. The browser uses TypeScript and Three.js. JSON Schema draft-07 defines interchange contracts independently of TypeScript. No ML training stack is required.

## Evidence and tradeoffs

A Cloud spike (`npm run spike`) evaluated 1,000 validated observation-to-intention calls in about 54ms on Node 24.19.0. This is a startup proof that the small headless loop works, not a comparative benchmark, a latency guarantee or a claim about Mac performance. Browser tests separately cover integration.

TypeScript lets the browser and offline runner share the exact sensor and rule code, avoiding a translation boundary during the first feedback session. The supplied rendering-kit contract also targets Three.js; its current retrieval failure does not change the runtime decision. Strict JSON validation and complete trace snapshots make inspection and future ports practical.

Python would make future statistical/ML experiments convenient, but using it for the first cognition core would add a second runtime and a port or transport layer immediately. No Python-vs-TypeScript benchmark was run. Rust would offer stronger systems guarantees but adds build/distribution effort for this deadline. Neither alternative is rejected for future experiments. If a Python or Rust model is added, preserve observation privacy, timestamps, deterministic fixtures and separate A/B approvals through the same JSON contracts.

## Consequences

- One `npm ci` / `npm run dev` workflow on Mac. Headless tests do not need a browser, GPU, external API or paid service.
- Exact dependency versions plus `package-lock.json`; Node major pinned in `.nvmrc`.
- Initial dependency and optional browser installation need internet. After installation, application and tests are local/offline. No CDN assets are fetched by the app.
- Three contributes most browser bundle size. It is acceptable for this local foundation; the build warning is recorded rather than mistaken for a failure.
- Body capabilities and JSON contracts are owned by this research project and do not inherit P2P's domain/compiler types.
