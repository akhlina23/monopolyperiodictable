# V1 Features — School Edition (`/v1`)

**Target Audience**: High school chemistry classes and fast board-game play (`© Kelompok 5 Kimia X-D 2026/2027`).

## Included Features
- **3D Interactive Monopoly Board**: Full 130-tile clockwise perimeter, recessed center pit, tactile 3D chemistry pieces (`Erlenmeyer Flask`, `Atom Model`, `Microscope`, `Lab Goggles`), 3D animated dice, and smooth camera presets (`Overview`, `Active Piece`, `Selected Tile`, `Top-Down`).
- **Simple Central Periodic Table**: Displays all 118 elements with atomic number, large symbol, English name, consistent chemical category colors, and a compact category legend. Clicking an element highlights its matching perimeter tile and opens a compact identity card without loading heavy research tabs.
- **3D Company Buildings & Spacious Property Panel**: Interactive 3D company building previews colored by chemical category and stamped with the element's own symbol (`1–4` small factory facilities and upgraded Big Company complex), full rent table, construction cost, 120%–200% START income, maintenance (`2×`), and auction controls.
- **Multiplayer**: Local Pass-and-Play (2–4 teams, IndexedDB auto-save + JSON export/import) and Online Sync (Firebase Auth + Firestore).
- **Dynamic AI Quizzes & Study Cases**: Server-side AI generation (`Gemini`, `OpenRouter`, `Claude`, `OpenAI`) with server-side quiz grading, 30s timer, and zero-penalty retry/cancel on API failure.
- **Admin Commands**: Protected server-authenticated Admin Console with non-destructive `Log Out Admin`.

## Intentionally Excluded from `/v1`
- No Properties / Electrons / Isotopes / Compounds research tabs.
- No temperature slider/state simulation.
- No rotatable 3D orbital/Bohr atom lab.
