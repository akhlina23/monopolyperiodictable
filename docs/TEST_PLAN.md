# Automated & Live Verification Plan (`TEST_PLAN.md`)

## 1. Automated Vitest Suites (`npm run test:v1`)
- **Board & Geometry Tests** (`boardAndPricing.test.ts`, `boardGeometry.test.ts`):
  - 130 unique tiles (`0..129`), 118 elements ordered `1..118`, 4 corners (`0, 33, 65, 98`), 4 main properties, 2 study cases, 2 quizzes, zero bounding-box overlap.
- **Pricing & START Income Tests** (`boardAndPricing.test.ts`, `v3EditionsAndAdmin.test.ts`):
  - Oxygen (`1,600 KK`): small cost `1,100 KK`, base rent `120 KK`, rent tiers `600 / 1,800 / 5,160 / 7,200 / 9,000 KK`, min auction `1,200 KK`, maintenance `3,200 KK`.
  - v3.0 START income (`120%–200%` of small cost): `1,320 / 1,540 / 1,760 / 1,980 / 2,200 KK`, `0 KK` fixed salary.
- **Gameplay & Customs/Jail Tests** (`gameplayAndPtable.test.ts`, `customsAndJail.test.ts`, `v3EditionsAndAdmin.test.ts`):
  - School Edition footer (`© Kelompok 5 Kimia X-D 2026/2027`), turn & position-locked purchase, clean auction, Bea Cukai -> Penjara transfer, `20,000 KK` jail bail + legacy save migration, bankruptcy triggers.
- **AI & Admin Security Tests** (`v3EditionsAndAdmin.test.ts`):
  - Zod schema validation & hidden answer-key sanitization, draw idempotency cache & deduplication, zero penalty on AI failure, wrong-password rejection, IP rate limiting, signed session verification, audit log recording, and non-destructive `Log Out Admin`.

## 2. Build, Lint & Live Verification
- `npm run lint` + `npm run build` (root launcher) and `npm -w V1-School-Edition run lint` + `npm -w V1-School-Edition run build`.
- Live endpoint checks on port `3000`: `/`, `/api/health`, `/api/editions`, `/v1/`, `/v1/api/health`.
