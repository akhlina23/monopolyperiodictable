import * as THREE from 'three';
import { BoardColorMode, BoardTile, ChemicalElement } from '../../types/game';
import { ELEMENTS_BY_ID, getCategoryAccentHex, getStateAtTemperature } from '../../engine/gameEngine';
import { MATTER_STATE_META } from '../../data/categories';

export const BOARD_3D = {
  size: 34,
  cornerSize: 3.2,
  edgeSpan: 34 - 2 * 3.2, // 27.6
  topCount: 32,
  rightCount: 31,
  bottomCount: 32,
  leftCount: 31,
};

export interface TileTransform3D {
  tile: BoardTile;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotationY: number;
}

export function getTileTransform3D(tile: BoardTile): TileTransform3D {
  const half = BOARD_3D.size / 2; // 17
  const c = BOARD_3D.cornerSize; // 3.2
  const halfC = c / 2; // 1.6
  const stepH = BOARD_3D.edgeSpan / BOARD_3D.topCount; // 0.8625
  const stepV = BOARD_3D.edgeSpan / BOARD_3D.rightCount; // ~0.8903

  const idx = tile.pathIndex;

  if (idx === 0) {
    // START: top-left
    return { tile, x: -half + halfC, z: -half + halfC, width: c, depth: c, rotationY: 0 };
  }
  if (idx >= 1 && idx <= 32) {
    const i = idx - 1;
    return {
      tile,
      x: -half + c + (i + 0.5) * stepH,
      z: -half + halfC,
      width: stepH - 0.03,
      depth: c,
      rotationY: 0,
    };
  }
  if (idx === 33) {
    // PENJARA: top-right
    return { tile, x: half - halfC, z: -half + halfC, width: c, depth: c, rotationY: 0 };
  }
  if (idx >= 34 && idx <= 64) {
    const i = idx - 34;
    return {
      tile,
      x: half - halfC,
      z: -half + c + (i + 0.5) * stepV,
      width: c,
      depth: stepV - 0.03,
      rotationY: 0,
    };
  }
  if (idx === 65) {
    // PARKIR: bottom-right
    return { tile, x: half - halfC, z: half - halfC, width: c, depth: c, rotationY: 0 };
  }
  if (idx >= 66 && idx <= 97) {
    const i = idx - 66;
    return {
      tile,
      x: half - c - (i + 0.5) * stepH,
      z: half - halfC,
      width: stepH - 0.03,
      depth: c,
      rotationY: 0,
    };
  }
  if (idx === 98) {
    // BEA CUKAI: bottom-left
    return { tile, x: -half + halfC, z: half - halfC, width: c, depth: c, rotationY: 0 };
  }
  // idx 99..129: left edge bottom-to-top
  const i = idx - 99;
  return {
    tile,
    x: -half + halfC,
    z: half - c - (i + 0.5) * stepV,
    width: c,
    depth: stepV - 0.03,
    rotationY: 0,
  };
}

export function getTileColorHex(
  tile: BoardTile,
  colorMode: BoardColorMode,
  temperatureC: number
): string {
  if (tile.corner === 'start') return '#10B981';
  if (tile.corner === 'jail') return '#F59E0B';
  if (tile.corner === 'parking') return '#286BFF';
  if (tile.corner === 'customs') return '#EF4444';
  if (tile.tileType === 'main_property') return '#F59E0B';
  if (tile.tileType === 'quiz') return '#FF8733';
  if (tile.tileType === 'study_case') return '#7029FF';

  if (tile.tileType === 'element' && tile.atomicNumber) {
    const el: ChemicalElement | undefined = ELEMENTS_BY_ID[tile.atomicNumber];
    if (!el) return '#6B7280';
    if (colorMode === 'state') {
      const st = getStateAtTemperature(el, temperatureC);
      return MATTER_STATE_META[st].hex;
    }
    return getCategoryAccentHex(el.category);
  }
  return '#4B5563';
}

export function createTileFaceTexture(
  tile: BoardTile,
  accentHex: string,
  ownerColor?: string | null
): THREE.CanvasTexture {
  const isSideLR = tile.side === 'left' || tile.side === 'right';
  const canvas = document.createElement('canvas');
  canvas.width = isSideLR && !tile.corner ? 256 : 128;
  canvas.height = isSideLR && !tile.corner ? 128 : 256;
  const ctx = canvas.getContext('2d')!;

  // Base dark card surface
  ctx.fillStyle = '#171721';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle top/edge accent stripe
  ctx.fillStyle = accentHex;
  if (isSideLR && !tile.corner) {
    ctx.fillRect(0, 0, 22, canvas.height);
  } else {
    ctx.fillRect(0, 0, canvas.width, 30);
  }

  // Ownership ring indicator
  if (ownerColor) {
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (tile.corner) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    const label =
      tile.corner === 'start'
        ? 'START ➔'
        : tile.corner === 'jail'
        ? 'JAIL'
        : tile.corner === 'parking'
        ? 'PARKING'
        : 'CUSTOMS';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 6);
    ctx.fillStyle = accentHex;
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(tile.title.slice(0, 14), canvas.width / 2, canvas.height / 2 + 40);
  } else if (tile.tileType === 'element' && tile.atomicNumber) {
    const el = ELEMENTS_BY_ID[tile.atomicNumber];
    if (isSideLR) {
      ctx.fillStyle = '#A5A5B5';
      ctx.font = '700 18px "JetBrains Mono", monospace';
      ctx.fillText(`${el.atomicNumber}`, 52, 26);

      ctx.fillStyle = '#F5F5F7';
      ctx.font = '800 44px "Space Grotesk", sans-serif';
      ctx.fillText(el.symbol, 132, 58);

      ctx.fillStyle = accentHex;
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(el.nameEn.slice(0, 11), 132, 92);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(`${el.basePriceKK}`, 215, 26);
    } else {
      ctx.fillStyle = '#A5A5B5';
      ctx.font = '700 18px "JetBrains Mono", monospace';
      ctx.fillText(`#${el.atomicNumber}`, canvas.width / 2, 54);

      ctx.fillStyle = '#F5F5F7';
      ctx.font = '800 44px "Space Grotesk", sans-serif';
      ctx.fillText(el.symbol, canvas.width / 2, 114);

      ctx.fillStyle = accentHex;
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(el.nameEn.slice(0, 10), canvas.width / 2, 162);

      ctx.fillStyle = '#D1D5DB';
      ctx.font = '700 16px "JetBrains Mono", monospace';
      ctx.fillText(`${el.basePriceKK}`, canvas.width / 2, 212);
    }
  } else {
    ctx.fillStyle = '#F5F5F7';
    ctx.font = '800 22px "Space Grotesk", sans-serif';
    const shortLabel =
      tile.tileType === 'quiz'
        ? 'QUIZ !'
        : tile.tileType === 'study_case'
        ? 'CASE ?'
        : tile.title.slice(0, 10).toUpperCase();
    ctx.fillText(shortLabel, canvas.width / 2, canvas.height / 2 + 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export const CENTER_PTABLE_COLS = 18;
export const CENTER_PTABLE_ROWS = 10;

export interface CenterElementGridCoord {
  col: number; // 1..18
  row: number; // 1..7, or 8.4 (La), 9.5 (Ac) in 3D space
  atlasCol: number; // 0..17
  atlasRow: number; // 0..9
}

export function getCenterElementGridCoord(el: ChemicalElement): CenterElementGridCoord {
  if (el.atomicNumber >= 57 && el.atomicNumber <= 71) {
    const col = 3 + (el.atomicNumber - 57);
    return { col, row: 8.4, atlasCol: col - 1, atlasRow: 8 };
  }
  if (el.atomicNumber >= 89 && el.atomicNumber <= 103) {
    const col = 3 + (el.atomicNumber - 89);
    return { col, row: 9.5, atlasCol: col - 1, atlasRow: 9 };
  }
  const col = el.groupNumber || 1;
  const row = el.period || 1;
  return { col, row, atlasCol: col - 1, atlasRow: row - 1 };
}

export function createCenterPeriodicAtlasTexture(
  elements: ChemicalElement[],
  colorMode: BoardColorMode,
  temperatureC: number
): THREE.CanvasTexture {
  const cellW = 144;
  const cellH = 144;
  const canvas = document.createElement('canvas');
  canvas.width = CENTER_PTABLE_COLS * cellW; // 2592
  canvas.height = CENTER_PTABLE_ROWS * cellH; // 1440
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0D0F18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  elements.forEach((el) => {
    const { atlasCol, atlasRow } = getCenterElementGridCoord(el);
    const x0 = atlasCol * cellW;
    const y0 = atlasRow * cellH;
    const state = getStateAtTemperature(el, temperatureC);
    const stateMeta = MATTER_STATE_META[state];
    const accentHex =
      colorMode === 'state' ? stateMeta.hex : getCategoryAccentHex(el.category);

    // Rich dark interior for crisp white/bright text contrast
    ctx.fillStyle = colorMode === 'state' ? stateMeta.bgHex : '#141724';
    ctx.fillRect(x0 + 2, y0 + 2, cellW - 4, cellH - 4);

    // Category / state top header stripe
    ctx.fillStyle = accentHex;
    ctx.fillRect(x0 + 2, y0 + 2, cellW - 4, 14);

    // Crisp outer border
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 3, y0 + 3, cellW - 6, cellH - 6);

    // 1. Atomic number (top-left)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(String(el.atomicNumber), x0 + 10, y0 + 30);

    // State indicator dot (top-right)
    ctx.beginPath();
    ctx.arc(x0 + cellW - 16, y0 + 30, 5, 0, Math.PI * 2);
    ctx.fillStyle = stateMeta.hex;
    ctx.fill();

    // 2. Element symbol (prominent center)
    ctx.textAlign = 'center';
    ctx.fillStyle = colorMode === 'state' ? stateMeta.textHex : '#FFFFFF';
    ctx.font = '800 46px "Space Grotesk", sans-serif';
    ctx.fillText(el.symbol, x0 + cellW / 2, y0 + 68);

    // 3. Element name (when space permits, cleanly truncated for long synthetic names)
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    const shortName = el.nameEn.length > 11 ? `${el.nameEn.slice(0, 10)}…` : el.nameEn;
    ctx.fillText(shortName, x0 + cellW / 2, y0 + 104);

    // 4. Atomic mass (bottom monospace)
    ctx.fillStyle = '#FDBA74';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    const massLabel = el.atomicMassDisplay.length > 9
      ? el.atomicMassDisplay.slice(0, 9)
      : el.atomicMassDisplay;
    ctx.fillText(massLabel, x0 + cellW / 2, y0 + 126);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

