import { describe, it, expect } from 'vitest';
import boardLayout from '../data/boardLayout.json';

const BOARD = {
  width: 1200,
  height: 1200,
  cornerSize: 112,
  edgeSpan: 1200 - 2 * 112, // 976
  topCount: 32,
  rightCount: 31,
  bottomCount: 32,
  leftCount: 31,
};

interface Rect {
  tileId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function calculateTileRects(tiles: any[]): Rect[] {
  const topStep = BOARD.edgeSpan / BOARD.topCount;
  const rightStep = BOARD.edgeSpan / BOARD.rightCount;
  const bottomStep = BOARD.edgeSpan / BOARD.bottomCount;
  const leftStep = BOARD.edgeSpan / BOARD.leftCount;

  return tiles.map((tile) => {
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;

    if (tile.pathIndex === 0) {
      x = 0;
      y = 0;
      w = BOARD.cornerSize;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex >= 1 && tile.pathIndex <= 32) {
      const i = tile.pathIndex - 1;
      x = BOARD.cornerSize + i * topStep;
      y = 0;
      w = topStep;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex === 33) {
      x = BOARD.width - BOARD.cornerSize;
      y = 0;
      w = BOARD.cornerSize;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex >= 34 && tile.pathIndex <= 64) {
      const i = tile.pathIndex - 34;
      x = BOARD.width - BOARD.cornerSize;
      y = BOARD.cornerSize + i * rightStep;
      w = BOARD.cornerSize;
      h = rightStep;
    } else if (tile.pathIndex === 65) {
      x = BOARD.width - BOARD.cornerSize;
      y = BOARD.height - BOARD.cornerSize;
      w = BOARD.cornerSize;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex >= 66 && tile.pathIndex <= 97) {
      const i = tile.pathIndex - 66;
      x = BOARD.width - BOARD.cornerSize - (i + 1) * bottomStep;
      y = BOARD.height - BOARD.cornerSize;
      w = bottomStep;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex === 98) {
      x = 0;
      y = BOARD.height - BOARD.cornerSize;
      w = BOARD.cornerSize;
      h = BOARD.cornerSize;
    } else if (tile.pathIndex >= 99 && tile.pathIndex <= 129) {
      const i = tile.pathIndex - 99;
      x = 0;
      y = BOARD.height - BOARD.cornerSize - (i + 1) * leftStep;
      w = BOARD.cornerSize;
      h = leftStep;
    }

    return {
      tileId: tile.tileId,
      x,
      y,
      w,
      h,
    };
  });
}

function doRectanglesOverlap(r1: Rect, r2: Rect): boolean {
  const tolerance = 0.001; // allow touching boundaries
  return (
    r1.x + tolerance < r2.x + r2.w &&
    r1.x + r1.w - tolerance > r2.x &&
    r1.y + tolerance < r2.y + r2.h &&
    r1.y + r1.h - tolerance > r2.y
  );
}

describe('Board Geometry & Overlap Automated Test (Section 2.5 & 7.3)', () => {
  const rects = calculateTileRects(boardLayout);

  it('all 130 tiles stay strictly within 1200x1200 board boundary', () => {
    rects.forEach((r) => {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1200.001);
      expect(r.y + r.h).toBeLessThanOrEqual(1200.001);
    });
  });

  it('zero overlaps between any pair of the 130 perimeter tiles', () => {
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const overlaps = doRectanglesOverlap(rects[i], rects[j]);
        if (overlaps) {
          console.error(`Overlap between ${rects[i].tileId} and ${rects[j].tileId}`);
        }
        expect(overlaps).toBe(false);
      }
    }
  });

  it('Tile Og118 (pathIndex 129) sits cleanly below START (pathIndex 0) without overlap', () => {
    const start = rects[0];
    const og = rects[129];
    expect(doRectanglesOverlap(start, og)).toBe(false);
    expect(og.y).toBeGreaterThanOrEqual(start.h - 0.001);
  });

  it('All tiles between Iodin (53) and Disprosium (66) have positive dimensions and zero overlap', () => {
    const tiles53to66 = boardLayout.filter(
      (t: any) => t.atomicNumber && t.atomicNumber >= 53 && t.atomicNumber <= 66
    );
    expect(tiles53to66.length).toBe(14);
    tiles53to66.forEach((t: any) => {
      const r = rects[t.pathIndex];
      expect(r.w).toBeGreaterThan(20);
      expect(r.h).toBeGreaterThan(20);
    });
  });
});
