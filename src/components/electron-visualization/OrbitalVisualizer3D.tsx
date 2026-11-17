import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChemicalElement } from '../../types/game';
import { parseExpandedElectronSubshells, SubshellOccupancy } from '../../utils/electronConfig';
import { Camera, Info, RotateCcw } from 'lucide-react';

interface OrbitalVisualizer3DProps {
  element: ChemicalElement;
}

type VisualizationMode = 'outline' | 'filled' | 'probability';
type AtomicViewType = 'orbital' | 'shells';
type ElectronCameraAngle = 'iso' | 'front' | 'top' | 'side';

interface OrbitalPreset {
  label: string;
  n: number;
  l: number;
  m: number;
}

const ORBITAL_PRESETS: OrbitalPreset[] = [
  { label: '1s', n: 1, l: 0, m: 0 },
  { label: '2s', n: 2, l: 0, m: 0 },
  { label: '2p', n: 2, l: 1, m: 0 },
  { label: '3s', n: 3, l: 0, m: 0 },
  { label: '3p', n: 3, l: 1, m: 1 },
  { label: '3d', n: 3, l: 2, m: 0 },
  { label: '4s', n: 4, l: 0, m: 0 },
  { label: '4p', n: 4, l: 1, m: 0 },
  { label: '4d', n: 4, l: 2, m: 2 },
  { label: '4f', n: 4, l: 3, m: 0 },
];

const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

// Real spherical harmonics magnitude |Y_l^m(theta, phi)| for authentic 3D lobe geometry
function evaluateAngularAmplitude(l: number, m: number, theta: number, phi: number): number {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const absM = Math.abs(m);

  if (l === 0) return 0.9;
  if (l === 1) {
    if (absM === 0) return Math.abs(ct) * 1.4;
    return Math.abs(st * (m > 0 ? Math.cos(phi) : Math.sin(phi))) * 1.4;
  }
  if (l === 2) {
    if (absM === 0) return Math.abs(3 * ct * ct - 1) * 0.72;
    if (absM === 1) return Math.abs(st * ct * (m > 0 ? Math.cos(phi) : Math.sin(phi))) * 2.4;
    return Math.abs(st * st * (m > 0 ? Math.cos(2 * phi) : Math.sin(2 * phi))) * 1.35;
  }
  if (absM === 0) return Math.abs(ct * (5 * ct * ct - 3)) * 0.65;
  if (absM === 1) return Math.abs(st * (5 * ct * ct - 1) * (m > 0 ? Math.cos(phi) : Math.sin(phi))) * 0.85;
  if (absM === 2) return Math.abs(st * st * ct * (m > 0 ? Math.cos(2 * phi) : Math.sin(2 * phi))) * 2.1;
  return Math.abs(st * st * st * (m > 0 ? Math.cos(3 * phi) : Math.sin(3 * phi))) * 1.35;
}

function getAngularSign(l: number, m: number, theta: number, phi: number): number {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const absM = Math.abs(m);
  if (l === 0) return 1;
  if (l === 1) return (absM === 0 ? ct : st * (m > 0 ? Math.cos(phi) : Math.sin(phi))) >= 0 ? 1 : -1;
  if (l === 2) {
    if (absM === 0) return 3 * ct * ct - 1 >= 0 ? 1 : -1;
    if (absM === 1) return st * ct * (m > 0 ? Math.cos(phi) : Math.sin(phi)) >= 0 ? 1 : -1;
    return st * st * (m > 0 ? Math.cos(2 * phi) : Math.sin(2 * phi)) >= 0 ? 1 : -1;
  }
  if (absM === 0) return ct * (5 * ct * ct - 3) >= 0 ? 1 : -1;
  return st * st * ct * (m >= 0 ? Math.cos(absM * phi) : Math.sin(absM * phi)) >= 0 ? 1 : -1;
}

const ElectronCameraController: React.FC<{
  angle: ElectronCameraAngle;
  trigger: number;
  distanceScale: number;
}> = ({ angle, trigger, distanceScale }) => {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 2.2, 5.4));
  const animating = useRef(false);

  useEffect(() => {
    animating.current = true;
    const d = 5.2 * distanceScale;
    if (angle === 'iso') {
      targetPos.current.set(d * 0.65, d * 0.45, d * 0.78);
    } else if (angle === 'front') {
      targetPos.current.set(0, 0.25, d * 1.05);
    } else if (angle === 'top') {
      targetPos.current.set(0, d * 1.08, 0.15);
    } else if (angle === 'side') {
      targetPos.current.set(d * 1.05, 0.25, 0);
    }
  }, [angle, trigger, distanceScale]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (animating.current) {
      const t = 1 - Math.exp(-6 * Math.min(delta, 0.05));
      camera.position.lerp(targetPos.current, t);
      controls.target.set(0, 0, 0);
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        animating.current = false;
      }
    }
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      enablePan
      dampingFactor={0.07}
      minDistance={2.2}
      maxDistance={16}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
};

const QuantumOrbitalMesh: React.FC<{
  n: number;
  l: number;
  m: number;
  mode: VisualizationMode;
  autoRotate: boolean;
}> = ({ n, l, m, mode, autoRotate }) => {
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, cloudGeo } = useMemo(() => {
    const segsU = 44;
    const segsV = 64;
    const geom = new THREE.SphereGeometry(1, segsV, segsU);
    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const scaleRadius = 0.85 + Math.min(n, 5) * 0.2;

    const posColor = new THREE.Color('#22D3EE');
    const negColor = new THREE.Color('#7029FF');

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const rUnit = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      const theta = Math.acos(THREE.MathUtils.clamp(vy / rUnit, -1, 1));
      const phi = Math.atan2(vz, vx);

      const amp = evaluateAngularAmplitude(l, m, theta, phi);
      const sign = getAngularSign(l, m, theta, phi);
      const r = Math.max(0.06, amp * scaleRadius);

      pos.setXYZ(i, (vx / rUnit) * r, (vy / rUnit) * r, (vz / rUnit) * r);
      const c = sign > 0 ? posColor : negColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const pts: number[] = [];
    const ptColors: number[] = [];
    let attempts = 0;
    while (pts.length < 2200 * 3 && attempts < 22000) {
      attempts++;
      const u = Math.random() * 2 - 1;
      const theta = Math.acos(u);
      const phi = Math.random() * Math.PI * 2;
      const amp = evaluateAngularAmplitude(l, m, theta, phi);
      const prob = Math.min(1, amp * amp * 0.55);
      if (Math.random() < prob) {
        const rad = (0.35 + Math.random() * 0.85) * amp * scaleRadius;
        pts.push(
          rad * Math.sin(theta) * Math.cos(phi),
          rad * Math.cos(theta),
          rad * Math.sin(theta) * Math.sin(phi)
        );
        const c = getAngularSign(l, m, theta, phi) > 0 ? posColor : negColor;
        ptColors.push(c.r, c.g, c.b);
      }
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    cGeo.setAttribute('color', new THREE.Float32BufferAttribute(ptColors, 3));

    return { geometry: geom, cloudGeo: cGeo };
  }, [n, l, m]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      cloudGeo.dispose();
    };
  }, [geometry, cloudGeo]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.45;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#FF8733" emissive="#FF8733" emissiveIntensity={1.2} />
      </mesh>

      <gridHelper args={[6, 12, '#1E293B', '#141422']} position={[0, -2.2, 0]} />

      {mode === 'probability' ? (
        <points geometry={cloudGeo}>
          <pointsMaterial size={0.055} vertexColors transparent opacity={0.88} sizeAttenuation />
        </points>
      ) : (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            vertexColors
            wireframe={mode === 'outline'}
            transparent
            opacity={mode === 'outline' ? 0.88 : 0.75}
            roughness={0.25}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

const ShellModel3D: React.FC<{
  element: ChemicalElement;
  autoRotate: boolean;
  selectedShellIdx: number | null;
  onSelectShell: (idx: number) => void;
}> = ({ element, autoRotate, selectedShellIdx, onSelectShell }) => {
  const shells = element.electronShells && element.electronShells.length > 0 ? element.electronShells : [1];
  const shellRefs = useRef<(THREE.Group | null)[]>([]);
  const outerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!autoRotate) return;
    if (outerRef.current) {
      outerRef.current.rotation.y += dt * 0.14;
    }
    shellRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const speed = (1.35 / (idx + 1)) * (idx % 2 === 0 ? 1 : -0.85);
      grp.rotation.y += dt * speed;
    });
  });

  return (
    <group ref={outerRef}>
      {/* Central Nucleus */}
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial
          color="#FF8733"
          emissive="#FF8733"
          emissiveIntensity={0.85}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>

      {shells.map((electronCount, shellIdx) => {
        const radius = 0.78 + shellIdx * 0.44;
        const tiltX = (shellIdx % 3) * 0.16;
        const tiltZ = ((shellIdx + 1) % 2) * 0.14;
        const isSelected = selectedShellIdx === shellIdx;
        const ringColor = isSelected ? '#FF8733' : '#286BFF';
        const electronColor = isSelected ? '#FDE047' : '#22D3EE';

        return (
          <group key={shellIdx} rotation={[tiltX, 0, tiltZ]}>
            {/* Clickable Shell Orbit Ring */}
            <mesh
              rotation={[Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectShell(shellIdx);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <torusGeometry args={[radius, isSelected ? 0.032 : 0.017, 10, 72]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={isSelected ? 0.95 : 0.55}
              />
            </mesh>

            {/* Revolving Electrons */}
            <group
              ref={(el) => {
                shellRefs.current[shellIdx] = el;
              }}
            >
              {Array.from({ length: electronCount }).map((_, eIdx) => {
                const angle = (eIdx / electronCount) * Math.PI * 2;
                return (
                  <mesh
                    key={eIdx}
                    position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShell(shellIdx);
                    }}
                  >
                    <sphereGeometry args={[isSelected ? 0.085 : 0.065, 12, 12]} />
                    <meshStandardMaterial
                      color={electronColor}
                      emissive={electronColor}
                      emissiveIntensity={isSelected ? 1.4 : 1.0}
                    />
                  </mesh>
                );
              })}
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const OrbitalVisualizer3D: React.FC<OrbitalVisualizer3DProps> = ({ element }) => {
  const [viewType, setViewType] = useState<AtomicViewType>('orbital');
  const [n, setN] = useState<number>(Math.min(4, Math.max(1, element.period || 2)));
  const [l, setL] = useState<number>(
    element.block === 'f' ? 3 : element.block === 'd' ? 2 : element.block === 'p' ? 1 : 0
  );
  const [m, setM] = useState<number>(0);
  const [visMode, setVisMode] = useState<VisualizationMode>('outline');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedShellIdx, setSelectedShellIdx] = useState<number | null>(null);
  const [cameraAngle, setCameraAngle] = useState<ElectronCameraAngle>('iso');
  const [cameraTrigger, setCameraTrigger] = useState<number>(0);
  const [contextLost, setContextLost] = useState(false);

  const subshellData = useMemo(
    () => parseExpandedElectronSubshells(element.expandedElectronConfig),
    [element.expandedElectronConfig]
  );

  // Sync highlighted outer orbital when user switches element
  useEffect(() => {
    const outer = subshellData.subshells[subshellData.subshells.length - 1];
    if (outer) {
      setN(Math.min(7, outer.n));
      setL(outer.l);
      setM(0);
    }
    const shellCount = element.electronShells?.length || 1;
    setSelectedShellIdx(shellCount - 1);
  }, [element.atomicNumber, element.electronShells?.length, subshellData.subshells]);

  const safeL = Math.min(l, n - 1);
  const safeM = THREE.MathUtils.clamp(m, -safeL, safeL);
  const subshellLetter = ['s', 'p', 'd', 'f'][safeL] || 's';
  const shells = element.electronShells || [];
  const distanceScale = viewType === 'shells' ? Math.max(1, shells.length * 0.25) : 1;

  const handleSelectSubshell = (sub: SubshellOccupancy) => {
    setViewType('orbital');
    setN(Math.min(7, sub.n));
    setL(sub.l);
    setM(0);
  };

  const triggerAngle = (ang: ElectronCameraAngle) => {
    setCameraAngle(ang);
    setCameraTrigger((c) => c + 1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-[440px]">
      {/* Left Quantum, Subshell Aufbau & Bohr Shell Controls */}
      <div className="lg:col-span-5 bg-[#171820] border border-white/10 rounded-xl p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[640px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F4F1EA] block">
              Electrons · {element.symbol} (Z={element.atomicNumber})
            </span>
            <span className="text-[10px] font-mono text-[#A6A9B7]">
              Total: {element.atomicNumber} e⁻ · Valence: {subshellData.valenceElectrons} e⁻
            </span>
          </div>
          <div className="flex bg-[#09090D] p-0.5 rounded-lg border border-white/10 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewType('orbital')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                viewType === 'orbital' ? 'bg-[#7029FF] text-white' : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Quantum Orbitals
            </button>
            <button
              type="button"
              onClick={() => setViewType('shells')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                viewType === 'shells' ? 'bg-[#286BFF] text-white' : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Bohr Shells
            </button>
          </div>
        </div>

        {/* Scientific Distinction Notice: Bohr Shells vs Quantum Mechanical Wavefunction */}
        <div className="bg-[#09090D]/80 border border-white/10 rounded-lg p-2.5 text-[10px] text-[#A6A9B7] flex items-start gap-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-[#22D3EE] shrink-0 mt-0.5" />
          <div>
            {viewType === 'orbital' ? (
              <span>
                <strong className="text-[#22D3EE]">Quantum Wavefunction Model:</strong> Visualizes 3D
                angular probability lobes{' '}
                <span className="font-mono text-[#F4F1EA]">|Yₗᵐ(θ, φ)|</span> (cyan = positive phase,
                violet = negative phase), NOT circular planetary orbits.
              </span>
            ) : (
              <span>
                <strong className="text-[#60A5FA]">Simplified Bohr Shell Model:</strong> Concentric shells
                illustrate principal energy level electron counts ({shells.join(' · ')}). Click any shell
                pill or ring to inspect its <span className="font-mono">2n²</span> capacity.
              </span>
            )}
          </div>
        </div>

        {/* Condensed + Expanded Configuration + Clickable Shells */}
        <div className="bg-[#20222D] border border-white/10 rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#A6A9B7]">Condensed Config:</span>
            <span className="font-mono font-bold text-[#F4F1EA]">{element.electronConfig}</span>
          </div>
          <div className="text-[10px] font-mono text-[#22D3EE] break-all bg-[#09090D]/80 p-1.5 rounded border border-white/5">
            {element.expandedElectronConfig}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {shells.map((cnt, idx) => {
              const activeShell = selectedShellIdx === idx;
              const maxCap = 2 * (idx + 1) * (idx + 1);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setViewType('shells');
                    setSelectedShellIdx(idx);
                  }}
                  title={`Shell ${SHELL_LETTERS[idx] || idx + 1}: ${cnt}/${maxCap} electrons`}
                  className={`px-2 py-1 rounded border text-[10px] font-mono tabular-nums cursor-pointer transition-colors ${
                    activeShell && viewType === 'shells'
                      ? 'bg-[#FF8733]/25 border-[#FF8733] text-white'
                      : 'bg-[#09090D] border-white/10 text-[#A6A9B7] hover:text-white'
                  }`}
                >
                  <span>{SHELL_LETTERS[idx] || `n=${idx + 1}`}:</span>{' '}
                  <strong className="text-[#FF8733]">{cnt}e⁻</strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Aufbau Subshell Orbital Filling Diagram */}
        <div className="bg-[#20222D] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-[#F4F1EA]">
              Orbital Filling Diagram (Click subshell to view 3D)
            </span>
            <span className="font-mono text-[#32C48D]">Valence = {subshellData.valenceElectrons}e⁻</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-0.5">
            {subshellData.subshells.map((sub) => {
              const isSelectedOrbital = viewType === 'orbital' && n === sub.n && safeL === sub.l;
              return (
                <button
                  key={sub.label}
                  type="button"
                  onClick={() => handleSelectSubshell(sub)}
                  className={`p-1.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    isSelectedOrbital
                      ? 'bg-[#7029FF]/25 border-[#7029FF]'
                      : sub.isValence
                      ? 'bg-[#09090D]/90 border-[#32C48D]/40 hover:border-[#32C48D]'
                      : 'bg-[#09090D]/70 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[9px] font-mono mb-1">
                    <span className={sub.isValence ? 'text-[#32C48D] font-bold' : 'text-[#A6A9B7]'}>
                      {sub.label}
                      <sup>{sub.electrons}</sup>
                    </span>
                    {sub.isValence && <span className="text-[8px] text-[#32C48D]">VAL</span>}
                  </div>
                  <div className="flex gap-0.5">
                    {sub.orbitalBoxes.map((box, bIdx) => (
                      <div
                        key={bIdx}
                        className="w-4 h-4 rounded-[3px] border border-white/20 bg-[#171820] flex items-center justify-center font-mono text-[9px] leading-none"
                      >
                        <span className={box.up ? 'text-[#22D3EE]' : 'text-transparent'}>↑</span>
                        <span className={box.down ? 'text-[#FF8733]' : 'text-transparent'}>↓</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {viewType === 'orbital' ? (
          <>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A6A9B7]">Principal (n)</span>
                  <span className="font-mono font-bold text-[#7029FF]">{n}</span>
                </div>
                <input
                  type="range"
                  aria-label="Principal quantum number n"
                  min={1}
                  max={7}
                  value={n}
                  onChange={(e) => {
                    const nextN = Number(e.target.value);
                    setN(nextN);
                    if (l >= nextN) setL(nextN - 1);
                  }}
                  className="w-full accent-[#7029FF] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A6A9B7]">Azimuthal (l)</span>
                  <span className="font-mono font-bold text-[#22D3EE]">
                    {safeL} ({subshellLetter})
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Azimuthal quantum number l"
                  min={0}
                  max={Math.min(3, n - 1)}
                  value={safeL}
                  onChange={(e) => {
                    const nextL = Number(e.target.value);
                    setL(nextL);
                    setM(THREE.MathUtils.clamp(m, -nextL, nextL));
                  }}
                  className="w-full accent-[#22D3EE] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A6A9B7]">Magnetic (mₗ)</span>
                  <span className="font-mono font-bold text-[#FF8733]">{safeM}</span>
                </div>
                <input
                  type="range"
                  aria-label="Magnetic quantum number m"
                  min={-safeL}
                  max={safeL}
                  value={safeM}
                  onChange={(e) => setM(Number(e.target.value))}
                  className="w-full accent-[#FF8733] cursor-pointer"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A6A9B7] block mb-1.5">
                Quick Orbital Presets
              </span>
              <div className="grid grid-cols-5 gap-1">
                {ORBITAL_PRESETS.map((p) => {
                  const active = p.n === n && p.l === safeL && p.m === safeM;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setN(p.n);
                        setL(p.l);
                        setM(p.m);
                      }}
                      className={`py-1 rounded text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                        active
                          ? 'bg-[#286BFF] border-[#286BFF] text-white'
                          : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
              {(['outline', 'filled', 'probability'] as VisualizationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setVisMode(mode)}
                  className={`py-1.5 rounded-lg border capitalize cursor-pointer ${
                    visMode === mode
                      ? 'bg-[#7029FF] border-[#7029FF] text-white'
                      : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-[#20222D] border border-white/10 rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-[#F4F1EA]">
              <span>
                {selectedShellIdx !== null
                  ? `Selected Shell ${SHELL_LETTERS[selectedShellIdx] || selectedShellIdx + 1} (n=${
                      selectedShellIdx + 1
                    })`
                  : `Shell Overview (${element.symbol})`}
              </span>
              {selectedShellIdx !== null && (
                <span className="font-mono text-[#FF8733] text-[11px]">
                  {shells[selectedShellIdx] ?? 0} / {2 * (selectedShellIdx + 1) ** 2} e⁻
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] tabular-nums">
              <div className="bg-[#09090D] p-2 rounded border border-white/10">
                <span className="text-[#A6A9B7] block text-[10px]">Protons / Electrons</span>
                <strong className="text-[#286BFF]">{element.atomicNumber}</strong>
              </div>
              <div className="bg-[#09090D] p-2 rounded border border-white/10">
                <span className="text-[#A6A9B7] block text-[10px]">Approx Neutrons</span>
                <strong className="text-[#FF8733]">
                  {Math.max(0, element.roundedMassForPricing - element.atomicNumber)}
                </strong>
              </div>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-xs text-[#A6A9B7] pt-1 border-t border-white/10 cursor-pointer">
          <span>Animate Rotation &amp; Electron Motion</span>
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="accent-[#7029FF] w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Right Interactive 3D Viewport */}
      <div className="lg:col-span-7 relative bg-[#09090D] border border-white/10 rounded-xl overflow-hidden min-h-[380px]">
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-[#171820]/95 border border-white/10 text-xs font-mono font-bold text-[#F4F1EA]">
            {viewType === 'orbital'
              ? `${n}${subshellLetter} Orbital (n=${n}, l=${safeL}, mₗ=${safeM})`
              : `${element.nameEn} (${element.symbol}) — ${shells.length} Shells`}
          </span>
        </div>

        {/* Viewing Angle Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-1 bg-[#171820]/95 border border-white/10 p-1 rounded-lg text-[10px] font-bold">
          <Camera className="w-3 h-3 text-[#A6A9B7] mx-1" />
          {(
            [
              { id: 'iso', label: 'Iso' },
              { id: 'front', label: 'Front' },
              { id: 'top', label: 'Top' },
              { id: 'side', label: 'Side' },
            ] as { id: ElectronCameraAngle; label: string }[]
          ).map((ang) => (
            <button
              key={ang.id}
              type="button"
              onClick={() => triggerAngle(ang.id)}
              className={`px-2 py-1 rounded cursor-pointer ${
                cameraAngle === ang.id
                  ? 'bg-[#286BFF] text-white'
                  : 'text-[#A6A9B7] hover:text-white hover:bg-[#20222D]'
              }`}
            >
              {ang.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => triggerAngle('iso')}
            title="Reset camera angle"
            className="p-1 rounded text-[#A6A9B7] hover:text-white hover:bg-[#20222D] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#09090D]/90 text-xs text-[#F4F1EA]">
            Restoring 3D electron viewport...
          </div>
        )}

        <Canvas
          camera={{ position: [3.4, 2.3, 4.1], fov: 44 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <color attach="background" args={['#09090D']} />
          <ambientLight intensity={0.68} />
          <directionalLight position={[5, 6, 4]} intensity={1.25} color="#FFFFFF" />
          <pointLight position={[-4, -3, -4]} intensity={0.75} color="#7029FF" />
          <ElectronCameraController
            angle={cameraAngle}
            trigger={cameraTrigger}
            distanceScale={distanceScale}
          />

          {viewType === 'orbital' ? (
            <QuantumOrbitalMesh n={n} l={safeL} m={safeM} mode={visMode} autoRotate={autoRotate} />
          ) : (
            <ShellModel3D
              element={element}
              autoRotate={autoRotate}
              selectedShellIdx={selectedShellIdx}
              onSelectShell={setSelectedShellIdx}
            />
          )}
        </Canvas>
      </div>
    </div>
  );
};
