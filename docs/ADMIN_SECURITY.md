# Admin Security & Audit Architecture (`ADMIN_SECURITY.md`)

**V1: School Edition (`/v1/`)** provides a discreet `Admin Commands` button connected to the server-authenticated Admin Console (`server/adminConsole.ts`).

## 1. Password & Session Controls
- **No Frontend Secrets**: No admin password or hash is bundled into client code, `localStorage`, or Firestore public documents.
- **Server-Side Verification**: Password verification compares SHA-256 digests with `crypto.timingSafeEqual` against `process.env.ADMIN_PASSWORD`.
- **Rate Limiting**: Repeated invalid login attempts are throttled (`5` failures within `5` minutes per IP lock out further guesses with `429 Too Many Requests`).
- **Signed Session Cookie**: Authenticated admin sessions issue an HMAC-SHA256 signed `HttpOnly; SameSite=Lax; Path=/` cookie (`ptm_v1_admin_session`) expiring automatically after 4 hours.
- **CSRF Header Guard**: Privileged admin endpoints require custom `X-Requested-With: PTM-Admin` headers and valid cookie verification.

## 2. Admin Capabilities & Game Continuity
- Full inspection & control over teams, positions, turn order, money/transactions, property deeds, small/big company levels, jail/cards, quiz/case failure counters, bankruptcy, forced victory, economy config, and generated AI quiz/study-case answer keys & rubrics.
- **Audit Separation**: Every mutation logs `{ id, timestamp, action, target, previousValue, newValue, reason, gameId, actorSessionId }` into a dedicated Admin Audit Log separate from player event logs.
- **Non-Destructive `Log Out Admin`**: Ending the admin session clears the `HttpOnly` cookie and closes the Admin Console while keeping `gameState` (`phase`, active turn, balances, ownerships) completely untouched.
