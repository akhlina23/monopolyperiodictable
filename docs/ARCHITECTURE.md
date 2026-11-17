# Architecture — Periodic Table Monopoly (V1: School Edition)

## 1. Standalone V1 + Root Preview Launcher Design

Periodic Table Monopoly runs **V1: School Edition** as an independent React + TypeScript + Three.js + Express application supervised by a lightweight root preview launcher:

- `/` — **V1 Preview Launcher** (`launcher/src/App.tsx`):
  Displays V1 server status (`127.0.0.1:3101`) and launches `/v1/`.
- `/v1/` — **School Edition** (`V1-School-Edition/`):
  Runs the 3D Monopoly board, 3D pieces, 3D dice, 3D category/element company models, **Simple Central Periodic Table** (`src/components/v1/SimplePeriodicTable.tsx`), Property Detail Panel, AI Quiz & Study Case modals, Online/Local Multiplayer, **Admin Commands**, and Customs-to-Jail (`20,000 KK` bail) rules.

## 2. V1 Application Modules (`V1-School-Edition/`)
- `src/engine/gameEngine.ts` & `src/engine/gameActions.ts` — Authoritative Monopoly rules, 120%–200% START business income, rent tiers, clean auctions, bankruptcy, Customs-to-Jail transfer, 20,000 KK bail, and admin mutations.
- `src/data/{elements.json,boardLayout.json,mainProperties.json,economy-config.json,categories.ts}` — Immutable pricing and 130-tile board topology.
- `src/components/board3d/{BoardScene3D.tsx,PlayerPiece3D.tsx,Dice3D.tsx,CompanyModel3D.tsx,boardCoordinates.ts}`.
- `src/components/v1/SimplePeriodicTable.tsx` — Classroom 118-element periodic table with category color legend.
- `src/components/{TileDetailModal.tsx,QuizModal.tsx,StudyCaseModal.tsx,AuctionModal.tsx}` & `src/components/admin/AdminConsoleModal.tsx`.
- `src/storage/indexedDB.ts` (`MonopolyV1SchoolDB` / `ptm_v1_school_`) & `src/services/firebase.ts` (`rooms_v1`).
- `server.ts`, `server/aiProviders.ts`, `server/adminConsole.ts` (`© Kelompok 5 Kimia X-D 2026/2027`).
