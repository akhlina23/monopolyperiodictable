import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChemicalElement } from '../../types/game';
import { parseExpandedElectronSubshells, SubshellOccupancy } from '../../utils/electronConfig';
import {
  buildNucleusCluster3D,
  evaluateSignedSphericalHarmonic,
  sampleQuantumProbabilityCloud,
} from '../../utils/quantumWavefunctions';
import { Camera, Eye, EyeOff, Info, MousePointerClick, RotateCcw } from 'lucide-react';

interface OrbitalVisualizer3DProps {
  element: ChemicalElement;
}

type VisualizationMode = 'filled' | 'outline' | 'probability';
type AtomicViewType = 'shells' | 'orbital';
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

// Pre-allocated scratch math helpers (zero per-frame GC in useFrame)
const _dummyObj = new THREE.Object3D();
const _targetQuat = new THREE.Quaternion();
const _targetEuler = new THREE.Euler();

const POSITIVE_PHASE_HEX = '#F59E0B'; // Warm Amber / Ochre
const NEGATIVE_PHASE_HEX = '#38BDF8'; // Cool Sky Blue
const PROTON_HEX = '#EF4444'; // Coral / Bright Red
const NEUTRON_HEX = '#3B82F6'; // Royal Blue

function getMagneticLabel(l: number, m: number): string {
  if (l === 0) return 's';
  if (l === 1) {
    if (m === -1) return 'pᵧ';
    if (m === 0) return 'p_z';
    return 'pₓ';
  }
  if (l === 2) {
    if (m === -2) return 'dₓᵧ';
    if (m === -1) return 'dᵧ_z';
    if (m === 0) return 'd_z²';
    if (m === 1) return 'dₓ_z';
    return 'dₓ²₋ᵧ²';
  }
  return `m=${m}`;
}

function createGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const OriginGridAndAxes: React.FC<{ visible: boolean; extent: number }> = ({
  visible,
  extent,
}) => {
  const { xGeo, yGeo, zGeo } = useMemo(() => {
    const makeAxis = (ax: [number, number, number], bx: [number, number, number]) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([...ax, ...bx], 3)
      );
      return geo;
    };
    return {
      xGeo: makeAxis([-extent, 0, 0], [extent, 0, 0]),
      yGeo: makeAxis([0, -extent, 0], [0, extent, 0]),
      zGeo: makeAxis([0, 0, -extent], [0, 0, extent]),
    };
  }, [extent]);

  useEffect(() => {
    return () => {
      xGeo.dispose();
      yGeo.dispose();
      zGeo.dispose();
    };
  }, [xGeo, yGeo, zGeo]);

  if (!visible) return null;

  const gridSize = Math.max(6, Math.ceil(extent * 2));
  return (
    <group position={[0, 0, 0]}>
      <gridHelper args={[gridSize, 16, '#334155', '#1B2133']} position={[0, 0, 0]} />
      <lineSegments geometry={xGeo}>
        <lineBasicMaterial color="#F43F5E" transparent opacity={0.78} />
      </lineSegments>
      <lineSegments geometry={yGeo}>
        <lineBasicMaterial color="#10B981" transparent opacity={0.78} />
      </lineSegments>
      <lineSegments geometry={zGeo}>
        <lineBasicMaterial color="#3B82F6" transparent opacity={0.78} />
      </lineSegments>
    </group>
  );
};

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
      targetPos.current.set(d * 0.68, d * 0.48, d * 0.78);
    } else if (angle === 'front') {
      targetPos.current.set(0, 0.25, d * 1.05);
    } else if (angle === 'top') {
      targetPos.current.set(0, d * 1.1, 0.15);
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
      maxDistance={18}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
};

const NucleusCluster3D: React.FC<{
  protons: number;
  neutrons: number;
}> = ({ protons, neutrons }) => {
  const cluster = useMemo(
    () => buildNucleusCluster3D(protons, neutrons, 0.34),
    [protons, neutrons]
  );

  const protonPositions = useMemo(
    () => cluster.particles.filter((p) => p.kind === 'p'),
    [cluster]
  );
  const neutronPositions = useMemo(
    () => cluster.particles.filter((p) => p.kind === 'n'),
    [cluster]
  );

  const protonMeshRef = useRef<THREE.InstancedMesh>(null);
  const neutronMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (protonMeshRef.current) {
      protonPositions.forEach((p, idx) => {
        _dummyObj.position.set(p.x, p.y, p.z);
        _dummyObj.scale.setScalar(1);
        _dummyObj.updateMatrix();
        protonMeshRef.current!.setMatrixAt(idx, _dummyObj.matrix);
      });
      protonMeshRef.current.instanceMatrix.needsUpdate = true;
      protonMeshRef.current.computeBoundingSphere();
    }
    if (neutronMeshRef.current) {
      neutronPositions.forEach((n, idx) => {
        _dummyObj.position.set(n.x, n.y, n.z);
        _dummyObj.scale.setScalar(1);
        _dummyObj.updateMatrix();
        neutronMeshRef.current!.setMatrixAt(idx, _dummyObj.matrix);
      });
      neutronMeshRef.current.instanceMatrix.needsUpdate = true;
      neutronMeshRef.current.computeBoundingSphere();
    }
  }, [protonPositions, neutronPositions]);

  const segs = cluster.particles.length > 100 ? 12 : 16;

  return (
    <group>
      {protonPositions.length > 0 && (
        <instancedMesh
          key={`p-${protonPositions.length}-${cluster.nucleonRadius.toFixed(4)}`}
          ref={protonMeshRef}
          args={[undefined, undefined, protonPositions.length]}
          frustumCulled={false}
        >
          <sphereGeometry args={[cluster.nucleonRadius, segs, segs]} />
          <meshStandardMaterial
            color={PROTON_HEX}
            emissive="#B91C1C"
            emissiveIntensity={0.35}
            roughness={0.28}
            metalness={0.18}
          />
        </instancedMesh>
      )}

      {neutronPositions.length > 0 && (
        <instancedMesh
          key={`n-${neutronPositions.length}-${cluster.nucleonRadius.toFixed(4)}`}
          ref={neutronMeshRef}
          args={[undefined, undefined, neutronPositions.length]}
          frustumCulled={false}
        >
          <sphereGeometry args={[cluster.nucleonRadius, segs, segs]} />
          <meshStandardMaterial
            color={NEUTRON_HEX}
            emissive="#1D4ED8"
            emissiveIntensity={0.28}
            roughness={0.28}
            metalness={0.18}
          />
        </instancedMesh>
      )}
    </group>
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
  const glowTexture = useMemo(() => createGlowSpriteTexture(), []);

  useEffect(() => {
    return () => {
      glowTexture.dispose();
    };
  }, [glowTexture]);

  const { filledGeo, wireframeGeo, cloudGeo } = useMemo(() => {
    const posColor = new THREE.Color(POSITIVE_PHASE_HEX);
    const negColor = new THREE.Color(NEGATIVE_PHASE_HEX);
    const scaleRadius = 0.92 + Math.min(n, 5) * 0.22;

    const buildSurface = (segsV: number, segsU: number) => {
      const geom = new THREE.SphereGeometry(1, segsV, segsU);
      const pos = geom.attributes.position;
      const colors = new Float32Array(pos.count * 3);

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const rUnit = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        const theta = Math.acos(THREE.MathUtils.clamp(vy / rUnit, -1, 1));
        const phi = Math.atan2(vz, vx);

        const signedAmp = evaluateSignedSphericalHarmonic(l, m, theta, phi);
        const r = Math.max(0.04, Math.abs(signedAmp) * scaleRadius);

        pos.setXYZ(i, (vx / rUnit) * r, (vy / rUnit) * r, (vz / rUnit) * r);
        const c = signedAmp >= 0 ? posColor : negColor;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.computeVertexNormals();
      return geom;
    };

    const fGeo = buildSurface(84, 58);
    const wGeo = buildSurface(44, 30);

    const cloud = sampleQuantumProbabilityCloud(
      n,
      l,
      m,
      8500,
      [posColor.r, posColor.g, posColor.b],
      [negColor.r, negColor.g, negColor.b]
    );
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
    cGeo.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));

    return { filledGeo: fGeo, wireframeGeo: wGeo, cloudGeo: cGeo };
  }, [n, l, m]);

  useEffect(() => {
    return () => {
      filledGeo.dispose();
      wireframeGeo.dispose();
      cloudGeo.dispose();
    };
  }, [filledGeo, wireframeGeo, cloudGeo]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Compact glowing atomic core at origin */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#F8FAFC" emissive="#F59E0B" emissiveIntensity={1.15} />
      </mesh>

      {mode === 'probability' ? (
        <points geometry={cloudGeo}>
          <pointsMaterial
            size={0.078}
            map={glowTexture}
            vertexColors
            transparent
            opacity={0.88}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      ) : mode === 'outline' ? (
        <mesh geometry={wireframeGeo}>
          <meshBasicMaterial
            vertexColors
            wireframe
            transparent
            opacity={0.78}
          />
        </mesh>
      ) : (
        <mesh geometry={filledGeo}>
          <meshStandardMaterial
            vertexColors
            transparent
            opacity={0.84}
            roughness={0.26}
            metalness={0.14}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

// Distinct deterministic gyroscopic angles for shells 1..7 when toggled into 3D gyroscopic mode
const GYRO_SHELL_TILTS: [number, number, number][] = [
  [0.52, 0.15, 0.44],
  [-0.64, 0.3, 0.56],
  [0.78, -0.25, -0.62],
  [-0.48, 0.45, -0.76],
  [0.92, -0.35, 0.34],
  [-0.84, 0.2, 0.72],
  [0.42, -0.5, -0.88],
];

const ShellModel3D: React.FC<{
  element: ChemicalElement;
  autoRotate: boolean;
  isGyroscopic: boolean;
  selectedShellIdx: number | null;
  onToggleGyroscopic: () => void;
  onSelectShell: (idx: number) => void;
  pointerDownScreenRef: React.MutableRefObject<{ x: number; y: number }>;
}> = ({
  element,
  autoRotate,
  isGyroscopic,
  selectedShellIdx,
  onToggleGyroscopic,
  onSelectShell,
  pointerDownScreenRef,
}) => {
  const shells =
    element.electronShells && element.electronShells.length > 0 ? element.electronShells : [1];
  const protons = element.atomicNumber;
  const neutrons = Math.max(0, Math.round(element.massValueForPricing) - element.atomicNumber);

  const outerRef = useRef<THREE.Group>(null);
  const tiltGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const spinGroupRefs = useRef<(THREE.Group | null)[]>([]);

  const handleAtomClick = (e: ThreeEvent<MouseEvent>, shellIdx?: number) => {
    e.stopPropagation();
    const dist = Math.hypot(
      e.clientX - pointerDownScreenRef.current.x,
      e.clientY - pointerDownScreenRef.current.y
    );
    if (dist > 6) return; // Ignore camera orbit drags
    if (typeof shellIdx === 'number') {
      onSelectShell(shellIdx);
    }
    onToggleGyroscopic();
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (outerRef.current && autoRotate) {
      outerRef.current.rotation.y += dt * 0.12;
    }

    // Smooth ~0.6-0.8s quaternion interpolation between Planar [0,0,0] and Gyroscopic 3D tilts
    const slerpAlpha = 1 - Math.exp(-5.4 * dt);

    shells.forEach((_, idx) => {
      const tiltGrp = tiltGroupRefs.current[idx];
      if (tiltGrp) {
        if (isGyroscopic) {
          const [tx, ty, tz] = GYRO_SHELL_TILTS[idx % GYRO_SHELL_TILTS.length];
          _targetEuler.set(tx, ty, tz);
        } else {
          _targetEuler.set(0, 0, 0);
        }
        _targetQuat.setFromEuler(_targetEuler);
        if (tiltGrp.quaternion.angleTo(_targetQuat) > 0.0005) {
          tiltGrp.quaternion.slerp(_targetQuat, slerpAlpha);
        } else {
          tiltGrp.quaternion.copy(_targetQuat);
        }
      }

      const spinGrp = spinGroupRefs.current[idx];
      if (spinGrp && autoRotate) {
        const speed = (1.35 / (idx + 1)) * (idx % 2 === 0 ? 1 : -0.85);
        spinGrp.rotation.y += dt * speed;
      }
    });
  });

  const outermostRadius = 0.82 + (shells.length - 1) * 0.44 + 0.15;

  return (
    <group ref={outerRef}>
      {/* Transparent outer hit sphere so clicking anywhere across the atom toggles Planar <-> Gyroscopic */}
      <mesh
        onClick={(e) => handleAtomClick(e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[outermostRadius, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Mass-Accurate 3D Packed Proton (#EF4444) & Neutron (#3B82F6) Nucleus Cluster */}
      <group onClick={(e) => handleAtomClick(e)}>
        <NucleusCluster3D protons={protons} neutrons={neutrons} />
      </group>

      {shells.map((electronCount, shellIdx) => {
        const radius = 0.82 + shellIdx * 0.44;
        const isSelected = selectedShellIdx === shellIdx;
        const ringColor = isSelected ? '#F59E0B' : '#38BDF8';
        const electronColor = isSelected ? '#FDE047' : '#22D3EE';

        return (
          <group
            key={shellIdx}
            ref={(el) => {
              tiltGroupRefs.current[shellIdx] = el;
            }}
          >
            {/* Electron Shell Orbit Ring */}
            <mesh
              rotation={[Math.PI / 2, 0, 0]}
              onClick={(e) => handleAtomClick(e, shellIdx)}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <torusGeometry args={[radius, isSelected ? 0.026 : 0.014, 12, 84]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={isSelected ? 0.92 : 0.52}
              />
            </mesh>

            {/* Revolving Electrons */}
            <group
              ref={(el) => {
                spinGroupRefs.current[shellIdx] = el;
              }}
            >
              {Array.from({ length: electronCount }).map((_, eIdx) => {
                const angle = (eIdx / electronCount) * Math.PI * 2;
                return (
                  <mesh
                    key={eIdx}
                    position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                    onClick={(e) => handleAtomClick(e, shellIdx)}
                  >
                    <sphereGeometry args={[isSelected ? 0.08 : 0.062, 12, 12]} />
                    <meshStandardMaterial
                      color={electronColor}
                      emissive={electronColor}
                      emissiveIntensity={isSelected ? 1.35 : 0.95}
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
  // Default to Bohr Shells so the packed 3D nucleus and Planar <-> Gyroscopic transition appear immediately
  const [viewType, setViewType] = useState<AtomicViewType>('shells');
  const [isGyroscopic, setIsGyroscopic] = useState<boolean>(false);
  const [showGridAndAxes, setShowGridAndAxes] = useState<boolean>(true);
  const [n, setN] = useState<number>(Math.min(4, Math.max(1, element.period || 2)));
  const [l, setL] = useState<number>(
    element.block === 'f' ? 3 : element.block === 'd' ? 2 : element.block === 'p' ? 1 : 0
  );
  const [m, setM] = useState<number>(0);
  const [visMode, setVisMode] = useState<VisualizationMode>('filled');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedShellIdx, setSelectedShellIdx] = useState<number | null>(null);
  const [cameraAngle, setCameraAngle] = useState<ElectronCameraAngle>('iso');
  const [cameraTrigger, setCameraTrigger] = useState<number>(0);
  const [contextLost, setContextLost] = useState(false);

  const pointerDownScreenRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const subshellData = useMemo(
    () => parseExpandedElectronSubshells(element.expandedElectronConfig),
    [element.expandedElectronConfig]
  );

  // Sync highlighted outer orbital & shell when user switches element
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

  const safeL = Math.min(l, Math.min(3, n - 1));
  const safeM = THREE.MathUtils.clamp(m, -safeL, safeL);
  const subshellLetter = ['s', 'p', 'd', 'f'][safeL] || 's';
  const shells = element.electronShells || [];
  const protons = element.atomicNumber;
  const neutrons = Math.max(0, Math.round(element.massValueForPricing) - element.atomicNumber);
  const distanceScale = viewType === 'shells' ? Math.max(1, shells.length * 0.26) : 1.05;
  const axesExtent = viewType === 'shells' ? Math.max(3.4, shells.length * 0.68 + 1.2) : 3.2;

  const handleSelectSubshell = (sub: SubshellOccupancy) => {
    setViewType('orbital');
    setN(Math.min(7, sub.n));
    setL(Math.min(3, sub.l));
    setM(0);
  };

  const triggerAngle = (ang: ElectronCameraAngle) => {
    setCameraAngle(ang);
    setCameraTrigger((c) => c + 1);
  };

  const mChoices = useMemo(() => {
    const arr: number[] = [];
    for (let val = -safeL; val <= safeL; val++) arr.push(val);
    return arr;
  }, [safeL]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[460px]">
      {/* Left Quantum, Subshell Aufbau & Bohr Shell Controls */}
      <div className="lg:col-span-5 bg-[#171820] border border-white/10 rounded-xl p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[660px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F4F1EA] block">
              Electrons · {element.symbol} (Z={element.atomicNumber})
            </span>
            <span className="text-[11px] font-mono text-[#A6A9B7] tabular-nums">
              {protons} p⁺ · {neutrons} n⁰ · {protons} e⁻ (Valence {subshellData.valenceElectrons})
            </span>
          </div>
          <div className="flex bg-[#09090D] p-1 rounded-lg border border-white/10 text-[11px] font-semibold gap-1">
            <button
              type="button"
              onClick={() => setViewType('shells')}
              className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                viewType === 'shells' ? 'bg-[#286BFF] text-white' : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Bohr Shells
            </button>
            <button
              type="button"
              onClick={() => setViewType('orbital')}
              className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                viewType === 'orbital' ? 'bg-[#7029FF] text-white' : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Quantum Orbitals
            </button>
          </div>
        </div>

        {/* Scientific Distinction Notice */}
        <div className="bg-[#09090D]/80 border border-white/10 rounded-lg p-2.5 text-[11px] text-[#A6A9B7] flex items-start gap-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div>
            {viewType === 'orbital' ? (
              <span>
                <strong className="text-[#F59E0B]">Quantum Wavefunction Model:</strong> Memodelkan
                lobus sudut &amp; radial <span className="font-mono text-[#F4F1EA]">ψₙₗₘ(r,θ,φ)</span>{' '}
                (Amber = fase +, Sky Blue = fase −), bukan lintasan orbit planet.
              </span>
            ) : (
              <span>
                <strong className="text-[#38BDF8]">Bohr Shell + Packed 3D Nucleus:</strong> Inti
                memuat <strong className="text-[#EF4444]">{protons} proton</strong> &amp;{' '}
                <strong className="text-[#3B82F6]">{neutrons} neutron</strong> sesuai massa atom.
                Klik atom 3D untuk beralih antara orbit <strong>Planar</strong> dan{' '}
                <strong>Gyroscopic 3D</strong>.
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
          <div className="text-[10px] font-mono text-[#38BDF8] break-all bg-[#09090D]/80 p-1.5 rounded border border-white/5">
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
                      ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-white'
                      : 'bg-[#09090D] border-white/10 text-[#A6A9B7] hover:text-white'
                  }`}
                >
                  <span>{SHELL_LETTERS[idx] || `n=${idx + 1}`}:</span>{' '}
                  <strong className="text-[#F59E0B]">{cnt}e⁻</strong>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Aufbau Subshell Orbital Filling Diagram */}
        <div className="bg-[#20222D] border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-[#F4F1EA]">
              Orbital Filling Diagram (Click subshell)
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
                        <span className={box.up ? 'text-[#38BDF8]' : 'text-transparent'}>↑</span>
                        <span className={box.down ? 'text-[#F59E0B]' : 'text-transparent'}>↓</span>
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
                  <span className="font-mono font-bold text-[#7029FF] tabular-nums">{n}</span>
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
                    if (l >= nextN) setL(Math.min(3, nextN - 1));
                  }}
                  className="w-full accent-[#7029FF] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#A6A9B7]">Azimuthal (l)</span>
                  <span className="font-mono font-bold text-[#38BDF8] tabular-nums">
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
                  className="w-full accent-[#38BDF8] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#A6A9B7]">Magnetic Orientation (mₗ)</span>
                  <span className="font-mono font-bold text-[#F59E0B] tabular-nums">
                    {safeM} ({getMagneticLabel(safeL, safeM)})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {mChoices.map((mVal) => (
                    <button
                      key={mVal}
                      type="button"
                      onClick={() => setM(mVal)}
                      className={`px-2 py-1 rounded border text-[10px] font-mono tabular-nums cursor-pointer transition-colors ${
                        safeM === mVal
                          ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-white font-bold'
                          : 'bg-[#09090D] border-white/10 text-[#A6A9B7] hover:text-white'
                      }`}
                    >
                      {mVal > 0 ? `+${mVal}` : mVal} ({getMagneticLabel(safeL, mVal)})
                    </button>
                  ))}
                </div>
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

            {/* 3-Option Quantum Render Mode Selector */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A6A9B7] block mb-1.5">
                Render Mode (Lisyarus Wavefunction)
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
                {(
                  [
                    { id: 'filled', label: 'Filled' },
                    { id: 'outline', label: 'Outline' },
                    { id: 'probability', label: 'Probability' },
                  ] as { id: VisualizationMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setVisMode(mode.id)}
                    className={`py-1.5 px-2 rounded-lg border cursor-pointer whitespace-nowrap transition-colors ${
                      visMode === mode.id
                        ? 'bg-[#7029FF] border-[#7029FF] text-white'
                        : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#20222D] border border-white/10 rounded-lg p-3 text-xs space-y-2.5">
            <div className="flex items-center justify-between font-bold text-[#F4F1EA]">
              <span>
                {selectedShellIdx !== null
                  ? `Shell ${SHELL_LETTERS[selectedShellIdx] || selectedShellIdx + 1} (n=${
                      selectedShellIdx + 1
                    })`
                  : `Shell Overview (${element.symbol})`}
              </span>
              {selectedShellIdx !== null && (
                <span className="font-mono text-[#F59E0B] text-[11px] tabular-nums">
                  {shells[selectedShellIdx] ?? 0} / {2 * (selectedShellIdx + 1) ** 2} e⁻
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
              <div className="bg-[#09090D] p-2 rounded border border-white/10 flex items-center justify-between">
                <span className="text-[#A6A9B7] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  Protons (Z)
                </span>
                <strong className="text-[#EF4444]">{protons}</strong>
              </div>
              <div className="bg-[#09090D] p-2 rounded border border-white/10 flex items-center justify-between">
                <span className="text-[#A6A9B7] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  Neutrons (N)
                </span>
                <strong className="text-[#3B82F6]">{neutrons}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGyroscopic((prev) => !prev)}
              className="w-full py-2 px-3 rounded-lg border border-[#286BFF]/50 bg-[#286BFF]/15 hover:bg-[#286BFF]/25 text-[#F4F1EA] text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Orbit Geometry: {isGyroscopic ? 'Gyroscopic 3D' : 'Ordered Planar'}</span>
              <span className="text-[10px] font-mono text-[#38BDF8]">Toggle</span>
            </button>
          </div>
        )}

        <label className="flex items-center justify-between text-xs text-[#A6A9B7] pt-1.5 border-t border-white/10 cursor-pointer">
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
      <div
        onPointerDown={(e) => {
          pointerDownScreenRef.current = { x: e.clientX, y: e.clientY };
        }}
        className="lg:col-span-7 relative bg-[#09090D] border border-white/10 rounded-xl overflow-hidden min-h-[420px]"
      >
        {/* Top-Left HUD Title + Clickable Orbit Mode Hint */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          <div className="px-2.5 py-1 rounded-md bg-[#171820] border border-white/10 text-xs font-mono font-bold text-[#F4F1EA] pointer-events-none">
            {viewType === 'orbital'
              ? `${n}${subshellLetter} Orbital · ${getMagneticLabel(safeL, safeM)} (n=${n}, l=${safeL}, mₗ=${safeM})`
              : `${element.nameEn} (${element.symbol}) · ${protons}p⁺ ${neutrons}n⁰ · ${shells.length} Shells`}
          </div>

          {viewType === 'shells' && (
            <button
              type="button"
              onClick={() => setIsGyroscopic((prev) => !prev)}
              className="px-2.5 py-1 rounded-md bg-[#171820] border border-[#38BDF8]/40 hover:border-[#38BDF8] text-[11px] font-semibold text-[#F4F1EA] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>
                Klik atom untuk mengubah mode orbit ·{' '}
                <strong className="text-[#38BDF8]">
                  {isGyroscopic ? '3D Gyroscopic' : 'Planar'}
                </strong>
              </span>
            </button>
          )}

          {viewType === 'orbital' && (
            <div className="px-2.5 py-1 rounded-md bg-[#171820] border border-white/10 text-[10px] font-mono text-[#A6A9B7] flex items-center gap-3 pointer-events-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                Phase +
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                Phase −
              </span>
              {visMode === 'probability' && <span>8,500 |ψ|² pts</span>}
            </div>
          )}
        </div>

        {/* Top-Right Viewport Controls: Camera Angles + Centered Grid & Axes Toggle */}
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-1 bg-[#171820] border border-white/10 p-1 rounded-lg text-[10px] font-bold">
          <Camera className="w-3 h-3 text-[#A6A9B7] mx-1" aria-hidden="true" />
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
              className={`px-2 py-1 rounded cursor-pointer whitespace-nowrap ${
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
            aria-label="Reset camera angle"
            className="p-1 rounded text-[#A6A9B7] hover:text-white hover:bg-[#20222D] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <span className="w-px h-4 bg-white/15 mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowGridAndAxes((prev) => !prev)}
            aria-pressed={showGridAndAxes}
            title={showGridAndAxes ? 'Hide centered grid & axes' : 'Show centered grid & axes'}
            className={`px-2 py-1 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
              showGridAndAxes
                ? 'bg-[#20222D] text-[#38BDF8] border border-[#38BDF8]/40'
                : 'text-[#A6A9B7] hover:text-white hover:bg-[#20222D]'
            }`}
          >
            {showGridAndAxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{showGridAndAxes ? 'Grid & Axes' : 'Grid Off'}</span>
          </button>
        </div>

        {/* Bottom-Left Axis Legend when Grid & Axes visible */}
        {showGridAndAxes && (
          <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-md bg-[#171820] border border-white/10 text-[10px] font-mono text-[#A6A9B7] flex items-center gap-3 pointer-events-none">
            <span className="text-[#F43F5E]">X</span>
            <span className="text-[#10B981]">Y</span>
            <span className="text-[#3B82F6]">Z</span>
            <span>Origin (0, 0, 0)</span>
          </div>
        )}

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
          <ambientLight intensity={0.62} />
          <hemisphereLight args={['#E0F2FE', '#0F172A', 0.45]} />
          <directionalLight position={[5, 6, 4]} intensity={1.3} color="#FFFBEB" />
          <pointLight position={[-4, -3, -4]} intensity={0.75} color="#38BDF8" />

          <ElectronCameraController
            angle={cameraAngle}
            trigger={cameraTrigger}
            distanceScale={distanceScale}
          />

          <OriginGridAndAxes visible={showGridAndAxes} extent={axesExtent} />

          {viewType === 'orbital' ? (
            <QuantumOrbitalMesh n={n} l={safeL} m={safeM} mode={visMode} autoRotate={autoRotate} />
          ) : (
            <ShellModel3D
              element={element}
              autoRotate={autoRotate}
              isGyroscopic={isGyroscopic}
              selectedShellIdx={selectedShellIdx}
              onToggleGyroscopic={() => setIsGyroscopic((prev) => !prev)}
              onSelectShell={setSelectedShellIdx}
              pointerDownScreenRef={pointerDownScreenRef}
            />
          )}
        </Canvas>
      </div>
    </div>
  );
};
