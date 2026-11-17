export interface NucleonParticle {
  x: number;
  y: number;
  z: number;
  kind: 'p' | 'n';
}

export interface NucleusClusterData {
  protons: number;
  neutrons: number;
  nucleonRadius: number;
  outerRadius: number;
  particles: NucleonParticle[];
}

/**
 * Generates a solid, full 360-degree tightly packed concentric 3D spherical cluster
 * of Z protons and N neutrons using multi-shell Fibonacci sphere distribution
 * from the center outward, scaled cleanly inside the innermost 1s Bohr shell (r = 0.82).
 */
export function buildNucleusCluster3D(
  protons: number,
  neutrons: number,
  maxClusterRadius = 0.34
): NucleusClusterData {
  const safeP = Math.max(0, Math.round(protons));
  const safeN = Math.max(0, Math.round(neutrons));
  const total = Math.max(1, safeP + safeN);

  if (total === 1) {
    return {
      protons: safeP,
      neutrons: safeN,
      nucleonRadius: 0.145,
      outerRadius: 0.145,
      particles: [{ x: 0, y: 0, z: 0, kind: safeP >= 1 ? 'p' : 'n' }],
    };
  }

  // Build unit-nucleon-radius (r = 1) coordinates first, then scale uniformly into maxClusterRadius
  const unitCoords: { x: number; y: number; z: number }[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  if (total === 2) {
    unitCoords.push({ x: -0.92, y: 0, z: 0 }, { x: 0.92, y: 0, z: 0 });
  } else if (total === 3) {
    const rRing = 1.08;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      unitCoords.push({ x: Math.cos(a) * rRing, y: 0, z: Math.sin(a) * rRing });
    }
  } else if (total === 4) {
    // Regular tetrahedron centered at origin
    const s = 1.14 / Math.sqrt(3);
    unitCoords.push(
      { x: s, y: s, z: s },
      { x: s, y: -s, z: -s },
      { x: -s, y: s, z: -s },
      { x: -s, y: -s, z: s }
    );
  } else if (total <= 8) {
    // Symmetric single 360-degree Fibonacci shell for compact light nuclei (5..8 nucleons)
    const rShell = 1.08 + total * 0.11;
    for (let j = 0; j < total; j++) {
      const yNorm = 1 - (2 * (j + 0.5)) / total;
      const ringR = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
      const phi = j * goldenAngle;
      unitCoords.push({
        x: Math.cos(phi) * ringR * rShell,
        y: yNorm * rShell,
        z: Math.sin(phi) * ringR * rShell,
      });
    }
  } else {
    // Multi-shell concentric Mackay-style Fibonacci spheres from exact center outward
    const shellCounts: number[] = [1];
    let remaining = total - 1;
    let k = 1;
    while (remaining > 0) {
      const cap = Math.round(10 * k * k + 2); // 12, 42, 92, 162, 252...
      const take = Math.min(remaining, cap);
      shellCounts.push(take);
      remaining -= take;
      k++;
    }

    // Rebalance sparse outermost shells so outer surface always covers 360° evenly
    const lastIdx = shellCounts.length - 1;
    if (lastIdx >= 2 && shellCounts[lastIdx] < 10) {
      if (total <= 18) {
        shellCounts.pop();
        shellCounts[1] = total - 1;
      } else {
        const needed = 10 - shellCounts[lastIdx];
        const transfer = Math.min(needed, Math.floor(shellCounts[lastIdx - 1] * 0.35));
        shellCounts[lastIdx - 1] -= transfer;
        shellCounts[lastIdx] += transfer;
      }
    }

    const shellStep = 1.76;
    shellCounts.forEach((count, shellIdx) => {
      if (shellIdx === 0) {
        unitCoords.push({ x: 0, y: 0, z: 0 });
        return;
      }
      // Adjust shell radius slightly when shell holds > 12 (e.g., 13..17) so spheres never pinch
      const nominalCap = Math.round(10 * shellIdx * shellIdx + 2);
      const fullnessScale = count > nominalCap ? Math.sqrt(count / nominalCap) : 1;
      const rShell = shellIdx * shellStep * fullnessScale;
      const azimuthOffset = shellIdx * 1.15;

      for (let j = 0; j < count; j++) {
        const yNorm = 1 - (2 * (j + 0.5)) / count;
        const ringR = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const phi = j * goldenAngle + azimuthOffset;
        unitCoords.push({
          x: Math.cos(phi) * ringR * rShell,
          y: yNorm * rShell,
          z: Math.sin(phi) * ringR * rShell,
        });
      }
    });
  }

  let maxUnitDist = 0;
  for (const c of unitCoords) {
    const d = Math.hypot(c.x, c.y, c.z);
    if (d > maxUnitDist) maxUnitDist = d;
  }

  const nucleonRadius = Math.max(
    0.036,
    Math.min(0.115, maxClusterRadius / (maxUnitDist + 1))
  );

  // Interleave protons and neutrons evenly from center outward across every shell
  const particles: NucleonParticle[] = [];
  let pCount = 0;
  let nCount = 0;
  for (let i = 0; i < total; i++) {
    let kind: 'p' | 'n';
    if (pCount < safeP && nCount < safeN) {
      const targetPRatio = safeP / total;
      const actualPRatio = i > 0 ? pCount / i : 0;
      kind = actualPRatio <= targetPRatio ? 'p' : 'n';
    } else {
      kind = pCount < safeP ? 'p' : 'n';
    }
    if (kind === 'p') pCount++;
    else nCount++;

    particles.push({
      x: unitCoords[i].x * nucleonRadius,
      y: unitCoords[i].y * nucleonRadius,
      z: unitCoords[i].z * nucleonRadius,
      kind,
    });
  }

  const outerRadius = (maxUnitDist + 1) * nucleonRadius;

  return {
    protons: safeP,
    neutrons: safeN,
    nucleonRadius,
    outerRadius,
    particles,
  };
}

/**
 * Computes exact signed real spherical harmonic Y_l^m(theta, phi)
 * scaled cleanly for 3D orbital visualization across s, p, d, and f subshells.
 */
export function evaluateSignedSphericalHarmonic(
  l: number,
  m: number,
  theta: number,
  phi: number
): number {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const absM = Math.abs(m);
  const az = m > 0 ? Math.cos(absM * phi) : m < 0 ? Math.sin(absM * phi) : 1;

  if (l === 0) return 0.92;
  if (l === 1) {
    if (absM === 0) return ct * 1.42;
    return st * az * 1.42;
  }
  if (l === 2) {
    if (absM === 0) return (3 * ct * ct - 1) * 0.72;
    if (absM === 1) return st * ct * az * 2.45;
    return st * st * az * 1.38;
  }
  // l === 3 (f-orbitals)
  if (absM === 0) return ct * (5 * ct * ct - 3) * 0.68;
  if (absM === 1) return st * (5 * ct * ct - 1) * az * 0.9;
  if (absM === 2) return st * st * ct * az * 2.25;
  return st * st * st * az * 1.42;
}

/**
 * Generalized Laguerre polynomial L_k^alpha(x) using stable 3-term recurrence.
 */
export function generalizedLaguerre(k: number, alpha: number, x: number): number {
  if (k <= 0) return 1;
  if (k === 1) return 1 + alpha - x;
  let lPrev = 1;
  let lCurr = 1 + alpha - x;
  for (let j = 2; j <= k; j++) {
    const lNext = ((2 * j - 1 + alpha - x) * lCurr - (j - 1 + alpha) * lPrev) / j;
    lPrev = lCurr;
    lCurr = lNext;
  }
  return lCurr;
}

/**
 * Unnormalized hydrogenic radial wavefunction R_{n,l}(r) on Bohr-scaled coordinate rho.
 */
export function evaluateRadialWavefunction(n: number, l: number, rNorm: number): number {
  const safeN = Math.max(1, Math.round(n));
  const safeL = Math.max(0, Math.min(safeN - 1, Math.round(l)));
  const k = safeN - safeL - 1;
  // Scale coordinate so outermost radial lobe fills ~2.1 viewport units
  const rhoMax = safeN * 2.4 + 3.2;
  const rho = (2 * rNorm * rhoMax) / (safeN * 2.2);
  const lag = generalizedLaguerre(k, 2 * safeL + 1, rho);
  return Math.exp(-rho * 0.5) * Math.pow(rho, safeL) * lag;
}

export interface QuantumCloudSample {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
}

/**
 * Deterministic-seeded PRNG (Mulberry32) so probability clouds are crisp and reproducible.
 */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rejection-samples a high-density 3D Monte Carlo cloud of |psi_{n,l,m}(r, theta, phi)|^2
 * with distinct positive (+) and negative (-) phase colors.
 */
export function sampleQuantumProbabilityCloud(
  n: number,
  l: number,
  m: number,
  targetCount = 8500,
  positiveRgb: [number, number, number] = [0.96, 0.62, 0.04], // Warm Amber #F59E0B
  negativeRgb: [number, number, number] = [0.22, 0.74, 0.97] // Cool Sky Blue #38BDF8
): QuantumCloudSample {
  const safeN = Math.max(1, Math.round(n));
  const safeL = Math.max(0, Math.min(safeN - 1, Math.round(l)));
  const safeM = Math.max(-safeL, Math.min(safeL, Math.round(m)));
  const rng = createSeededRng(safeN * 1009 + safeL * 131 + (safeM + 10) * 17);

  const visualRadius = 1.65 + Math.min(safeN, 5) * 0.24;

  // Sweep radial probability envelope r^2 * |R(r)|^2 to normalize rejection threshold
  let maxRadialProb = 1e-6;
  for (let s = 1; s <= 180; s++) {
    const r = (s / 180) * visualRadius;
    const rad = evaluateRadialWavefunction(safeN, safeL, r);
    const pr = r * r * rad * rad;
    if (pr > maxRadialProb) maxRadialProb = pr;
  }

  // Sweep angular max for |Y_l^m|^2
  let maxAngularProb = 0.1;
  for (let it = 0; it <= 32; it++) {
    const theta = (it / 32) * Math.PI;
    for (let ip = 0; ip < 32; ip++) {
      const phi = (ip / 32) * Math.PI * 2;
      const yVal = evaluateSignedSphericalHarmonic(safeL, safeM, theta, phi);
      if (yVal * yVal > maxAngularProb) maxAngularProb = yVal * yVal;
    }
  }

  const positions = new Float32Array(targetCount * 3);
  const colors = new Float32Array(targetCount * 3);
  let accepted = 0;
  let attempts = 0;
  const maxAttempts = targetCount * 40;

  while (accepted < targetCount && attempts < maxAttempts) {
    attempts++;
    const r = rng() * visualRadius;
    const u = rng() * 2 - 1;
    const theta = Math.acos(u);
    const phi = rng() * Math.PI * 2;

    const rad = evaluateRadialWavefunction(safeN, safeL, r);
    const yVal = evaluateSignedSphericalHarmonic(safeL, safeM, theta, phi);

    const radialProb = (r * r * rad * rad) / maxRadialProb;
    const angularProb = (yVal * yVal) / maxAngularProb;
    const prob = radialProb * angularProb;

    if (rng() < prob) {
      const sinTheta = Math.sin(theta);
      const idx = accepted * 3;
      positions[idx] = r * sinTheta * Math.cos(phi);
      positions[idx + 1] = r * Math.cos(theta);
      positions[idx + 2] = r * sinTheta * Math.sin(phi);

      const sign = rad * yVal >= 0 ? 1 : -1;
      const rgb = sign >= 0 ? positiveRgb : negativeRgb;
      // Subtle brightness boost near peak probability cores
      const lum = 0.72 + 0.28 * Math.min(1, Math.sqrt(prob));
      colors[idx] = Math.min(1, rgb[0] * lum);
      colors[idx + 1] = Math.min(1, rgb[1] * lum);
      colors[idx + 2] = Math.min(1, rgb[2] * lum);
      accepted++;
    }
  }

  return {
    positions: positions.subarray(0, accepted * 3),
    colors: colors.subarray(0, accepted * 3),
    count: accepted,
  };
}
