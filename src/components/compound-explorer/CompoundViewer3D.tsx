import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { ChemicalCompound } from '../../data/compounds';
import {
  BondOrder,
  CompoundAtom,
  CompoundBond,
  CompoundStructure3D,
  getCompoundStructure3D,
  getCPKStyle,
} from '../../data/compoundStructures';
import { ELEMENTS_BY_ID } from '../../engine/gameEngine';
import { Atom, Box, Camera, Info, Layers, RotateCcw, Sparkles } from 'lucide-react';

export type CompoundDisplayMode = 'ball-and-stick' | 'space-filling' | 'lattice';
type CompoundCameraPreset = 'iso' | 'top' | 'side';

interface CompoundViewer3DProps {
  compound: ChemicalCompound;
  onSelectElement?: (atomicNumber: number) => void;
}

function detectSoftwareGl(gl: THREE.WebGLRenderer): boolean {
  try {
    const context = gl.getContext();
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const rendererStr = String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      return /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererStr);
    }
  } catch {
    // ignore
  }
  return false;
}

const StudioEnv: React.FC<{ onSoftwareGl: (soft: boolean) => void }> = ({ onSoftwareGl }) => {
  const { gl, scene } = useThree();
  useEffect(() => {
    onSoftwareGl(detectSoftwareGl(gl));
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.72;
    return () => {
      scene.environment = null;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, onSoftwareGl]);
  return null;
};

function createSymbolSpriteTexture(symbol: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);

  ctx.beginPath();
  ctx.arc(48, 48, 36, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9, 9, 13, 0.86)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 32px "JetBrains Mono", monospace';
  ctx.fillText(symbol, 48, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const CompoundCameraRig: React.FC<{
  preset: CompoundCameraPreset;
  trigger: number;
  fitRadius: number;
}> = ({ preset, trigger, fitRadius }) => {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0, 0, 8));
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const animating = useRef(false);

  useEffect(() => {
    animating.current = true;
    const dist = Math.max(4.8, fitRadius * 2.35);
    desiredTarget.current.set(0, 0, 0);
    if (preset === 'iso') {
      desiredPos.current.set(dist * 0.62, dist * 0.48, dist * 0.82);
    } else if (preset === 'top') {
      desiredPos.current.set(0, dist * 1.12, 0.15);
    } else {
      desiredPos.current.set(dist * 1.1, 0.2, 0);
    }
  }, [preset, trigger, fitRadius]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (animating.current) {
      const t = 1 - Math.exp(-6.5 * Math.min(delta, 0.05));
      camera.position.lerp(desiredPos.current, t);
      controls.target.lerp(desiredTarget.current, t);
      if (camera.position.distanceTo(desiredPos.current) < 0.05) {
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
      minDistance={1.8}
      maxDistance={28}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
};

interface BondSegmentProps {
  bond: CompoundBond;
  bondIndex: number;
  atomA: CompoundAtom;
  atomB: CompoundAtom;
  isSelected: boolean;
  displayMode: CompoundDisplayMode;
  onSelect: (bondIndex: number) => void;
}

const BondSegment3D: React.FC<BondSegmentProps> = ({
  bond,
  bondIndex,
  atomA,
  atomB,
  isSelected,
  displayMode,
  onSelect,
}) => {
  const { midpoint, quaternion, length, perpOffset } = useMemo(() => {
    const pA = new THREE.Vector3(atomA.x, atomA.y, atomA.z);
    const pB = new THREE.Vector3(atomB.x, atomB.y, atomB.z);
    const dir = new THREE.Vector3().subVectors(pB, pA);
    const len = Math.max(0.001, dir.length());
    const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
    const unitDir = dir.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDir);

    // Compute orthogonal vector for multi-bond cylinder separation
    const refUp = Math.abs(unitDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(unitDir, refUp).normalize();
    return { midpoint: mid, quaternion: quat, length: len, perpOffset: perp };
  }, [atomA, atomB]);

  if (displayMode === 'space-filling') return null;

  const isCoordination = bond.order === 'ionic' || bond.order === 'network';
  const radius = isSelected
    ? 0.085
    : isCoordination
    ? 0.042
    : bond.order === 2
    ? 0.048
    : 0.068;

  const color = isSelected
    ? '#FF8733'
    : bond.order === 'ionic'
    ? '#60A5FA'
    : bond.order === 'network'
    ? '#F59E0B'
    : '#CBD5E1';

  const offsets =
    bond.order === 2
      ? [-0.075, 0.075]
      : bond.order === 3
      ? [-0.1, 0, 0.1]
      : [0];

  return (
    <group>
      {offsets.map((off, idx) => {
        const pos = midpoint.clone().addScaledVector(perpOffset, off);
        return (
          <mesh
            key={idx}
            position={[pos.x, pos.y, pos.z]}
            quaternion={quaternion}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(bondIndex);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
            }}
          >
            <cylinderGeometry args={[radius, radius, length, 14]} />
            <meshStandardMaterial
              color={color}
              emissive={isSelected ? '#FF8733' : '#000000'}
              emissiveIntensity={isSelected ? 0.6 : 0}
              roughness={0.35}
              metalness={0.25}
              transparent={isCoordination}
              opacity={isCoordination ? (displayMode === 'lattice' ? 0.72 : 0.48) : 1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const MoleculeScene3D: React.FC<{
  structure: CompoundStructure3D;
  displayMode: CompoundDisplayMode;
  autoRotate: boolean;
  showLabels: boolean;
  selectedAtomIdx: number | null;
  selectedBondIdx: number | null;
  onSelectAtom: (idx: number) => void;
  onSelectBond: (idx: number) => void;
}> = ({
  structure,
  displayMode,
  autoRotate,
  showLabels,
  selectedAtomIdx,
  selectedBondIdx,
  onSelectAtom,
  onSelectBond,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Shared sphere geometry for atoms (scaled per atom radius) -> minimal allocations
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 28, 22), []);
  const haloGeo = useMemo(() => new THREE.SphereGeometry(1.26, 20, 16), []);

  useEffect(() => {
    return () => {
      sphereGeo.dispose();
      haloGeo.dispose();
    };
  }, [sphereGeo, haloGeo]);

  // Cached CanvasTextures per element symbol, disposed cleanly on structure change / unmount
  const symbolTextures = useMemo(() => {
    const cache: Record<string, THREE.CanvasTexture> = {};
    structure.atoms.forEach((a) => {
      if (!cache[a.symbol]) {
        cache[a.symbol] = createSymbolSpriteTexture(a.symbol);
      }
    });
    return cache;
  }, [structure]);

  useEffect(() => {
    return () => {
      Object.values(symbolTextures).forEach((t) => t.dispose());
    };
  }, [symbolTextures]);

  // Bounding box for optional crystal lattice cell wireframe
  const bounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    structure.atoms.forEach((a) => {
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y);
      minZ = Math.min(minZ, a.z);
      maxX = Math.max(maxX, a.x);
      maxY = Math.max(maxY, a.y);
      maxZ = Math.max(maxZ, a.z);
    });
    const pad = 1.1;
    const sizeX = Math.max(2, maxX - minX + pad);
    const sizeY = Math.max(2, maxY - minY + pad);
    const sizeZ = Math.max(2, maxZ - minZ + pad);
    return {
      center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] as [number, number, number],
      size: [sizeX, sizeY, sizeZ] as [number, number, number],
    };
  }, [structure]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.28;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Lattice / Unit-Cell Wireframe Box in Crystal Lattice mode */}
      {displayMode === 'lattice' && (
        <mesh position={bounds.center}>
          <boxGeometry args={bounds.size} />
          <meshBasicMaterial color="#286BFF" wireframe transparent opacity={0.28} />
        </mesh>
      )}

      {/* Bonds */}
      {structure.bonds.map((bond, idx) => {
        const atomA = structure.atoms[bond.from];
        const atomB = structure.atoms[bond.to];
        if (!atomA || !atomB) return null;
        return (
          <BondSegment3D
            key={`${bond.from}-${bond.to}-${idx}`}
            bond={bond}
            bondIndex={idx}
            atomA={atomA}
            atomB={atomB}
            isSelected={selectedBondIdx === idx}
            displayMode={displayMode}
            onSelect={onSelectBond}
          />
        );
      })}

      {/* Atoms */}
      {structure.atoms.map((atom, idx) => {
        const style = getCPKStyle(atom.symbol);
        const radius =
          displayMode === 'space-filling'
            ? style.vdwRadius
            : displayMode === 'lattice'
            ? style.covalentRadius * 0.92
            : style.covalentRadius;
        const isSelected = selectedAtomIdx === idx;

        return (
          <group key={atom.id + idx} position={[atom.x, atom.y, atom.z]}>
            <mesh
              geometry={sphereGeo}
              scale={[radius, radius, radius]}
              castShadow
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelectAtom(idx);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <meshStandardMaterial
                color={style.color}
                roughness={0.26}
                metalness={atom.symbol === 'Fe' || atom.symbol === 'Cu' || atom.symbol === 'Ag' ? 0.55 : 0.15}
                emissive={isSelected ? '#FF8733' : '#000000'}
                emissiveIntensity={isSelected ? 0.45 : 0}
              />
            </mesh>

            {isSelected && (
              <mesh geometry={haloGeo} scale={[radius, radius, radius]}>
                <meshBasicMaterial color="#FF8733" wireframe transparent opacity={0.65} />
              </mesh>
            )}

            {showLabels && displayMode !== 'space-filling' && (
              <sprite
                position={[0, radius + 0.24, 0]}
                scale={[0.38, 0.38, 0.38]}
              >
                <spriteMaterial
                  map={symbolTextures[atom.symbol]}
                  transparent
                  depthTest={false}
                />
              </sprite>
            )}
          </group>
        );
      })}
    </group>
  );
};

function formatBondOrderLabel(order: BondOrder): string {
  if (order === 1) return 'Single Covalent (1)';
  if (order === 2) return 'Double Covalent (2)';
  if (order === 3) return 'Triple Covalent (3)';
  if (order === 'ionic') return 'Ionic / Coordination';
  return 'Extended Covalent Network';
}

export const CompoundViewer3D: React.FC<CompoundViewer3DProps> = ({
  compound,
  onSelectElement,
}) => {
  const structure = getCompoundStructure3D(compound.id);

  const [displayMode, setDisplayMode] = useState<CompoundDisplayMode>('ball-and-stick');
  const [cameraPreset, setCameraPreset] = useState<CompoundCameraPreset>('iso');
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedAtomIdx, setSelectedAtomIdx] = useState<number | null>(0);
  const [selectedBondIdx, setSelectedBondIdx] = useState<number | null>(null);
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Reset mode & selection cleanly when switching compounds
  useEffect(() => {
    if (structure) {
      setDisplayMode(
        structure.representation === 'covalent' ? 'ball-and-stick' : 'lattice'
      );
      setSelectedAtomIdx(0);
      setSelectedBondIdx(null);
      setCameraPreset('iso');
      setCameraTrigger((c) => c + 1);
    }
  }, [compound.id, structure]);

  const fitRadius = useMemo(() => {
    if (!structure) return 3.2;
    let maxR = 2.0;
    structure.atoms.forEach((a) => {
      maxR = Math.max(maxR, Math.hypot(a.x, a.y, a.z) + 1.0);
    });
    return maxR;
  }, [structure]);

  const selectedAtom =
    structure && selectedAtomIdx !== null ? structure.atoms[selectedAtomIdx] ?? null : null;
  const selectedAtomElement = selectedAtom ? ELEMENTS_BY_ID[selectedAtom.atomicNumber] : null;

  const bondedNeighbors = useMemo(() => {
    if (!structure || selectedAtomIdx === null) return [];
    const list: { neighborIndex: number; neighbor: CompoundAtom; order: BondOrder; distanceA: number }[] = [];
    structure.bonds.forEach((b) => {
      if (b.from === selectedAtomIdx || b.to === selectedAtomIdx) {
        const otherIdx = b.from === selectedAtomIdx ? b.to : b.from;
        const other = structure.atoms[otherIdx];
        const self = structure.atoms[selectedAtomIdx];
        if (other && self) {
          const dist = Math.hypot(other.x - self.x, other.y - self.y, other.z - self.z);
          list.push({ neighborIndex: otherIdx, neighbor: other, order: b.order, distanceA: dist });
        }
      }
    });
    return list;
  }, [structure, selectedAtomIdx]);

  const selectedBond =
    structure && selectedBondIdx !== null ? structure.bonds[selectedBondIdx] ?? null : null;
  const selectedBondPair = useMemo(() => {
    if (!structure || !selectedBond) return null;
    const a = structure.atoms[selectedBond.from];
    const b = structure.atoms[selectedBond.to];
    if (!a || !b) return null;
    return {
      a,
      b,
      distanceA: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
    };
  }, [structure, selectedBond]);

  if (!structure) {
    return (
      <div className="bg-[#09090D] border border-white/10 rounded-xl p-6 text-center space-y-2">
        <p className="font-display text-sm font-bold text-[#F4F1EA]">
          3D Structural Coordinates Unavailable for {compound.formula} ({compound.nameEn})
        </p>
        <p className="text-xs text-[#A6A9B7] max-w-md mx-auto">
          Verified atomic coordinates for this compound are not yet present in the local structure
          library. Non-verified geometries are never fabricated.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      {/* Large Interactive 3D Molecular / Crystal Viewport */}
      <div className="xl:col-span-8 relative bg-[#09090D] border border-white/15 rounded-xl overflow-hidden min-h-[380px] h-[420px]">
        {/* Top Left Mode Switcher */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1 bg-[#171820]/95 border border-white/10 p-1 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setDisplayMode('ball-and-stick')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer ${
              displayMode === 'ball-and-stick'
                ? 'bg-[#286BFF] text-white'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" /> Ball &amp; Stick
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('space-filling')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer ${
              displayMode === 'space-filling'
                ? 'bg-[#7029FF] text-white'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" /> Space-Filling
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('lattice')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer ${
              displayMode === 'lattice'
                ? 'bg-[#FF8733] text-[#09090D]'
                : 'text-[#A6A9B7] hover:text-white'
            }`}
          >
            <Box className="w-3 h-3" /> Crystal Lattice
          </button>
        </div>

        {/* Top Right Camera Presets & Labels */}
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-1 bg-[#171820]/95 border border-white/10 p-1 rounded-xl text-[10px] font-bold">
          <Camera className="w-3 h-3 text-[#A6A9B7] mx-1" />
          {(['iso', 'top', 'side'] as CompoundCameraPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setCameraPreset(p);
                setCameraTrigger((c) => c + 1);
              }}
              className={`px-2 py-1 rounded-lg uppercase cursor-pointer ${
                cameraPreset === p ? 'bg-[#286BFF] text-white' : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCameraPreset('iso');
              setCameraTrigger((c) => c + 1);
            }}
            className="px-2 py-1 rounded-lg bg-[#20222D] text-[#F4F1EA] hover:bg-[#343946] flex items-center gap-1 cursor-pointer"
            title="Reset Camera"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Bottom Left Controls & Atom Count */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-[#171820]/95 border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-[#A6A9B7]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                className="accent-[#7029FF] cursor-pointer"
              />
              <span>Auto-Rotate</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-[#286BFF] cursor-pointer"
              />
              <span>Atom Labels</span>
            </label>
          </div>
          <div className="bg-[#171820]/95 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#A6A9B7]">
            {structure.atoms.length} atoms · {structure.bonds.length} bonds · Click atom or bond to inspect
          </div>
        </div>

        {contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#09090D]/90 text-xs text-[#F4F1EA]">
            Restoring 3D molecular canvas...
          </div>
        )}

        <Canvas
          shadows={!isSoftwareGl}
          dpr={[1, 2]}
          camera={{ position: [4.5, 3.2, 5.8], fov: 40, near: 0.1, far: 100 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
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
          <StudioEnv onSoftwareGl={setIsSoftwareGl} />
          <ambientLight intensity={0.45} color="#CBD5E1" />
          <directionalLight position={[6, 9, 6]} intensity={1.45} color="#FFF7ED" />
          <directionalLight position={[-6, -4, -6]} intensity={0.65} color="#93C5FD" />
          <CompoundCameraRig preset={cameraPreset} trigger={cameraTrigger} fitRadius={fitRadius} />
          <MoleculeScene3D
            structure={structure}
            displayMode={displayMode}
            autoRotate={autoRotate}
            showLabels={showLabels}
            selectedAtomIdx={selectedAtomIdx}
            selectedBondIdx={selectedBondIdx}
            onSelectAtom={(idx) => {
              setSelectedAtomIdx(idx);
              setSelectedBondIdx(null);
            }}
            onSelectBond={(idx) => {
              setSelectedBondIdx(idx);
              setSelectedAtomIdx(null);
            }}
          />
        </Canvas>
      </div>

      {/* Right Structural & Interactive Atom/Bond Inspector */}
      <div className="xl:col-span-4 bg-[#20222D] border border-white/10 rounded-xl p-3.5 flex flex-col gap-3 text-xs overflow-y-auto max-h-[420px]">
        <div className="border-b border-white/10 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-extrabold text-[#FF8733]">{compound.formula}</span>
            <span className="px-2 py-0.5 rounded bg-[#09090D] border border-white/10 text-[10px] font-mono text-[#93C5FD]">
              {compound.molarMassGmol} g/mol
            </span>
          </div>
          <div className="font-display text-base font-bold text-white">
            {compound.nameEn}{' '}
            <span className="text-xs font-normal text-[#A6A9B7]">({compound.nameId})</span>
          </div>
          <p className="text-[11px] text-[#A6A9B7] mt-1 leading-relaxed">{structure.geometrySummary}</p>
          {structure.unitCellNote && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-[#152238] border border-[#294E8A] text-[10px] text-[#93C5FD] flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{structure.unitCellNote}</span>
            </div>
          )}
        </div>

        {/* Selected Atom Inspector */}
        {selectedAtom && selectedAtomElement && (
          <div className="bg-[#09090D]/80 border border-[#FF8733]/40 rounded-xl p-3 space-y-2 tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF8733] font-bold flex items-center gap-1">
                <Atom className="w-3.5 h-3.5" /> Selected Atom #{selectedAtomIdx} ({selectedAtom.id})
              </span>
              {onSelectElement && (
                <button
                  type="button"
                  onClick={() => onSelectElement(selectedAtom.atomicNumber)}
                  className="px-2 py-0.5 rounded bg-[#286BFF] hover:bg-[#1D57DC] text-white text-[10px] font-bold cursor-pointer"
                >
                  Inspect {selectedAtom.symbol}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <span className="text-[#A6A9B7] block text-[10px]">Element</span>
                <strong className="text-white">
                  {selectedAtomElement.nameEn} ({selectedAtom.symbol}, Z={selectedAtom.atomicNumber})
                </strong>
              </div>
              <div>
                <span className="text-[#A6A9B7] block text-[10px]">Coordinates (Å)</span>
                <strong className="font-mono text-[#22D3EE]">
                  ({selectedAtom.x.toFixed(2)}, {selectedAtom.y.toFixed(2)}, {selectedAtom.z.toFixed(2)})
                </strong>
              </div>
            </div>

            {selectedAtom.role && (
              <div className="text-[11px] text-[#A6A9B7]">
                Role: <strong className="text-[#F4F1EA]">{selectedAtom.role}</strong>
              </div>
            )}

            <div className="pt-1.5 border-t border-white/10">
              <span className="text-[10px] font-bold uppercase text-[#A6A9B7] block mb-1">
                Bonded Neighbors ({bondedNeighbors.length})
              </span>
              {bondedNeighbors.length === 0 ? (
                <span className="text-[11px] text-[#A6A9B7]">No direct bonds in this fragment.</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {bondedNeighbors.map((nb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedAtomIdx(nb.neighborIndex);
                        setSelectedBondIdx(null);
                      }}
                      className="px-2 py-1 rounded bg-[#20222D] hover:bg-[#2C2F3D] border border-white/10 text-[10px] font-mono text-[#F4F1EA] cursor-pointer"
                    >
                      {nb.neighbor.id} ({nb.distanceA.toFixed(2)} Å)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Bond Inspector */}
        {selectedBond && selectedBondPair && (
          <div className="bg-[#09090D]/80 border border-[#286BFF]/50 rounded-xl p-3 space-y-1.5 tabular-nums">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#93C5FD] font-bold block">
              Selected Bond #{selectedBondIdx}
            </span>
            <div className="text-sm font-mono font-bold text-white">
              {selectedBondPair.a.id} ({selectedBondPair.a.symbol}) ↔ {selectedBondPair.b.id} (
              {selectedBondPair.b.symbol})
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A6A9B7]">Order / Type:</span>
              <strong className="text-[#FF8733]">{formatBondOrderLabel(selectedBond.order)}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A6A9B7]">Bond Length:</span>
              <strong className="font-mono text-[#22D3EE]">
                {selectedBondPair.distanceA.toFixed(3)} Å
              </strong>
            </div>
          </div>
        )}

        {/* Compound Physical Properties & CPK Legend */}
        <div className="space-y-1 text-[11px] tabular-nums pt-1">
          <div className="flex justify-between">
            <span className="text-[#A6A9B7]">Classification:</span>
            <strong className="text-[#F4F1EA]">{compound.compoundType}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A6A9B7]">Melting / Boiling:</span>
            <strong className="font-mono text-[#F4F1EA]">
              {compound.meltingPointC !== null ? `${compound.meltingPointC}°C` : 'Data belum tersedia'} /{' '}
              {compound.boilingPointC !== null ? `${compound.boilingPointC}°C` : 'Data belum tersedia'}
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A6A9B7]">Water Solubility:</span>
            <strong className="text-[#86EFAC]">{compound.waterSolubility}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A6A9B7]">Structure Source:</span>
            <span className="text-[#A6A9B7] text-right truncate max-w-[180px]">{structure.source}</span>
          </div>
        </div>

        {/* CPK Element Color Key */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
          {compound.elements.map((z) => {
            const el = ELEMENTS_BY_ID[z];
            if (!el) return null;
            const style = getCPKStyle(el.symbol);
            return (
              <span
                key={z}
                className="px-2 py-0.5 rounded bg-[#09090D] border border-white/10 text-[10px] font-mono flex items-center gap-1.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/25"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-[#F4F1EA] font-bold">{el.symbol}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
