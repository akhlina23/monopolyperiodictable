# PERIODIC TABLE MONOPOLY — Research Edition

Interactive 3D Chemistry Monopoly combined with a full Ptable-inspired Atomic & Molecular Research Explorer.

**Attribution:** `© Akhdan Habibi Ramadhani`

---

## Core Features
- **3D Monopoly Chemistry Board (130 Tiles)**: Interactive 3D board, dice, animated tokens, Title Deed ownership & 2x maintenance, 120%–200% START company income, clean-property 70% minimum bidding auctions, and automatic `Bea Cukai` (`corner-customs`) transfers to `Penjara` (`corner-jail`) with a `20,000 KK` jail release bail fee.
- **Interactive Ptable Research Explorer**:
  - **Properties & Temperature Simulation**: Interactive temperature slider (`0°C` default, `°C` / `°F` / `K`) updating Solid / Liquid / Gas / Unknown states and property heatmaps across the periodic table and 3D board.
  - **Electrons & 3D Orbitals**: Aufbau shell diagrams, Hund's rule orbital spin boxes, quantum numbers (`n`, `l`, `m_l`, `m_s`), and interactive 3D quantum orbital visualizer.
  - **Isotopes Viewer**: Curated nuclide tables, atomic masses, half-lives, and decay modes.
  - **Compounds Database & 3D Molecular Viewer**: Interactive rotatable 3D molecular structures for covalent molecules, ionic lattices, and covalent networks.
- **AI Educational Cards & Admin Console**: Server-side AI Quiz and Study Case generation (`@google/genai` plus optional OpenRouter, Anthropic, and OpenAI providers) and HttpOnly session-authenticated Admin Commands.
- **Local & Online Multiplayer**: Offline persistence via IndexedDB (`MonopolyV2ResearchDB`) and real-time online room synchronization via Cloud Firestore (`rooms_v2` with `v2_` room IDs), pre-wired to `firebase-applet-config.json` with optional `VITE_FIREBASE_*` overrides.

---

## Scripts

```bash
npm install      # Install dependencies
npm run lint     # Type-check with TypeScript (tsc --noEmit)
npm run test     # Run Vitest suite
npm run build    # Build production bundle into dist/
npm run dev      # Start Express + Vite dev server on PORT (default 3000)
npm run start    # Run production server (set NODE_ENV=production)
```
