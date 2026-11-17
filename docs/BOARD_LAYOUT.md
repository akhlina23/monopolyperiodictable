# Board Layout Specification (Exact 130 Tiles)

The 3D Monopoly perimeter forms a square track centered around a recessed 118-element periodic table pit.

## Tile Count Breakdown

| Tile Type | Count | Notes |
|---|---:|---|
| Chemical Elements | 118 | Ordered clockwise `Z = 1` (H) through `Z = 118` (Og) |
| Corner Tiles | 4 | `0`: START, `33`: PENJARA, `65`: PARKIR, `98`: BEA CUKAI |
| Main Properties | 4 | `8`: Pengolah Air, `41`: Pembangkit Listrik, `73`: Transportasi, `106`: Pertambangan |
| Study Cases | 2 | `16`: Study Case 1 (Top), `81`: Study Case 2 (Bottom) |
| Flashcard Quizzes | 2 | `49`: Flashcard Quiz 1 (Right), `114`: Flashcard Quiz 2 (Left) |
| **Total** | **130** | Continuous clockwise `pathIndex` `0..129` |

## Perimeter Geometry Invariants
- **Board Width / Depth**: `34 × 34` 3D world units (`BOARD_3D.size`).
- **Corner Size**: `3.2 × 3.2` units.
- **Top Edge (32 non-corner tiles, pathIndex 1..32)**: From `START` (top-left) to `PENJARA` (top-right): H..N, Pengolah Air, O..Si, Study Case 1, P..Zn.
- **Right Edge (31 non-corner tiles, pathIndex 34..64)**: From `PENJARA` to `PARKIR` (bottom-right): Ga..Rb, Pembangkit Listrik, Sr..Ru, Flashcard Quiz 1, Rh..Pr.
- **Bottom Edge (32 non-corner tiles, pathIndex 66..97)**: Right-to-left from `PARKIR` to `BEA CUKAI` (bottom-left): Nd..Dy, Transportasi, Ho..Ta, Study Case 2, W..Ac.
- **Left Edge (31 non-corner tiles, pathIndex 99..129)**: Bottom-to-top from `BEA CUKAI` back to `START`: Th..Cm, Pertambangan, Bk..Lr, Flashcard Quiz 2, Rf..Og.

Every tile uses explicit `boardLayout.json` coordinates transformed by `getTileTransform3D` in `src/components/board3d/boardCoordinates.ts`, verified overlap-free in `src/test/boardGeometry.test.ts`.
