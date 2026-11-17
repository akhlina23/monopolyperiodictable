import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import {
  BoardColorMode,
  BoardTile,
  ChemicalElement,
  PropertyOwnership,
  Team,
} from '../../types/game';
import {
  ELEMENTS_BY_ID,
  ELEMENTS_LIST,
  TILES_BY_PATH_INDEX,
  getCategoryAccentHex,
  getStateAtTemperature,
} from '../../engine/gameEngine';
import { MATTER_STATE_META } from '../../data/categories';
import {
  CENTER_PTABLE_COLS,
  CENTER_PTABLE_ROWS,
  createCenterPeriodicAtlasTexture,
  createTileFaceTexture,
  getCenterElementGridCoord,
  getTileColorHex,
  getTileTransform3D,
} from './boardCoordinates';
import { PlayerPiece3D } from './PlayerPiece3D';
import { Dice3D } from './Dice3D';
import { CompanyBuildingCluster3D } from './CompanyModel3D';

export type CameraPreset = 'overview' | 'follow' | 'inspect' | 'top' | 'ptable';

interface BoardScene3DProps {
  tiles: BoardTile[];
  teams: Team[];
  activeTeamIndex: number;
  properties: Record<string, PropertyOwnership>;
  lastDice: [number, number];
  isRolling: boolean;
  hopQueue: number[];
  onHopComplete?: () => void;
  colorMode: BoardColorMode;
  temperatureC: number;
  selectedAtomicNumber: number | null;
  cameraPreset: CameraPreset;
  cameraTrigger: number;
  onTileClick: (tile: BoardTile) => void;
  onElementSelect: (element: ChemicalElement) => void;
  reducedMotion?: boolean;
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

const StudioEnvironment: React.FC<{ onSoftwareGlDetected: (isSoft: boolean) => void }> = ({
  onSoftwareGlDetected,
}) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const isSoft = detectSoftwareGl(gl);
    onSoftwareGlDetected(isSoft);

    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.65;

    return () => {
      scene.environment = null;
      envTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, onSoftwareGlDetected]);

  return null;
};

const CameraRig: React.FC<{
  preset: CameraPreset;
  trigger: number;
  activePositionIndex: number;
  inspectedAtomicNumber: number | null;
  tiles: BoardTile[];
}> = ({ preset, trigger, activePositionIndex, inspectedAtomicNumber, tiles }) => {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0, 27, 24.5));
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    isAnimating.current = true;
    if (preset === 'overview') {
      desiredPos.current.set(0, 27, 24.5);
      desiredTarget.current.set(0, 0, 0);
    } else if (preset === 'top') {
      desiredPos.current.set(0, 38, 2.5);
      desiredTarget.current.set(0, 0, 0);
    } else if (preset === 'ptable') {
      desiredPos.current.set(0, 20.5, 6.2);
      desiredTarget.current.set(0, 0, -1.6);
    } else if (preset === 'follow') {
      const tile = TILES_BY_PATH_INDEX[activePositionIndex] || tiles[0];
      const tf = getTileTransform3D(tile);
      desiredTarget.current.set(tf.x * 0.72, 0.2, tf.z * 0.72);
      desiredPos.current.set(tf.x * 1.05, 13.5, tf.z * 1.05 + 11.5);
    } else if (preset === 'inspect') {
      const targetTile = inspectedAtomicNumber
        ? tiles.find((t) => t.atomicNumber === inspectedAtomicNumber) ||
          TILES_BY_PATH_INDEX[activePositionIndex]
        : TILES_BY_PATH_INDEX[activePositionIndex];
      const tf = getTileTransform3D(targetTile || tiles[0]);
      desiredTarget.current.set(tf.x, 0.25, tf.z);
      desiredPos.current.set(tf.x * 0.72, 9.5, tf.z * 0.72 + 8.5);
    }
  }, [preset, trigger, activePositionIndex, inspectedAtomicNumber, tiles]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (isAnimating.current) {
      const t = 1 - Math.exp(-5.5 * Math.min(delta, 0.05));
      camera.position.lerp(desiredPos.current, t);
      controls.target.lerp(desiredTarget.current, t);
      if (camera.position.distanceTo(desiredPos.current) < 0.08) {
        isAnimating.current = false;
      }
    }
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.22}
      minDistance={9}
      maxDistance={56}
      onStart={() => {
        isAnimating.current = false;
      }}
    />
  );
};

const Tile3D: React.FC<{
  tile: BoardTile;
  accentHex: string;
  ownership?: PropertyOwnership;
  ownerColor?: string | null;
  isActiveTile: boolean;
  isHighlighted: boolean;
  onSelect: (tile: BoardTile) => void;
}> = React.memo(({ tile, accentHex, ownership, ownerColor, isActiveTile, isHighlighted, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const tf = useMemo(() => getTileTransform3D(tile), [tile]);

  const element = tile.atomicNumber ? ELEMENTS_BY_ID[tile.atomicNumber] : null;
  const categoryHex = element ? getCategoryAccentHex(element.category) : accentHex;

  const texture = useMemo(() => {
    return createTileFaceTexture(tile, accentHex, ownerColor);
  }, [tile, accentHex, ownerColor]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const liftY = hovered ? 0.14 : isHighlighted ? 0.1 : 0;

  return (
    <group position={[tf.x, 0.15 + liftY, tf.z]}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(tile);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[tf.width, 0.24, tf.depth]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.38}
          metalness={0.2}
          emissive={isActiveTile ? '#286BFF' : isHighlighted ? '#FF8733' : '#000000'}
          emissiveIntensity={isActiveTile ? 0.32 : isHighlighted ? 0.28 : 0}
        />
      </mesh>

      {(isActiveTile || isHighlighted) && (
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[tf.width + 0.06, tf.depth + 0.06]} />
          <meshBasicMaterial
            color={isActiveTile ? '#286BFF' : '#FF8733'}
            transparent
            opacity={0.22}
          />
        </mesh>
      )}

      {/* Category-Colored & Element-Emblem 3D Company Buildings on Owned Tiles */}
      {ownership && element && (ownership.smallCompanies > 0 || ownership.hasLargeCompany) && (
        <group
          position={[0, 0.16, 0]}
          rotation={[
            0,
            tile.side === 'left'
              ? Math.PI / 2
              : tile.side === 'right'
              ? -Math.PI / 2
              : tile.side === 'bottom'
              ? Math.PI
              : 0,
            0,
          ]}
        >
          <CompanyBuildingCluster3D
            symbol={element.symbol}
            atomicNumber={element.atomicNumber}
            categoryHex={categoryHex}
            smallCompanies={ownership.smallCompanies}
            hasLargeCompany={ownership.hasLargeCompany}
            scale={0.32}
          />
        </group>
      )}
    </group>
  );
});

const CenterPeriodicRelief3D: React.FC<{
  colorMode: BoardColorMode;
  temperatureC: number;
  selectedAtomicNumber: number | null;
  onElementSelect: (el: ChemicalElement) => void;
}> = ({ colorMode, temperatureC, selectedAtomicNumber, onElementSelect }) => {
  const [hoveredAtomic, setHoveredAtomic] = useState<number | null>(null);
  const cellW = 1.24;
  const cellD = 1.14;
  const faceW = cellW - 0.08;
  const faceD = cellD - 0.08;
  const startX = -((18 * cellW) / 2) + cellW / 2;
  const startZ = -6.0;

  const atlasTexture = useMemo(
    () => createCenterPeriodicAtlasTexture(ELEMENTS_LIST, colorMode, temperatureC),
    [colorMode, temperatureC]
  );

  useEffect(() => {
    return () => {
      atlasTexture.dispose();
    };
  }, [atlasTexture]);

  // Pre-build 118 UV-mapped top label plane geometries once and dispose on unmount
  const cellPlanes = useMemo(() => {
    const map: Record<number, THREE.PlaneGeometry> = {};
    ELEMENTS_LIST.forEach((el) => {
      const { atlasCol, atlasRow } = getCenterElementGridCoord(el);
      const geom = new THREE.PlaneGeometry(faceW, faceD);
      const uv = geom.attributes.uv;
      const u0 = atlasCol / CENTER_PTABLE_COLS;
      const u1 = (atlasCol + 1) / CENTER_PTABLE_COLS;
      const vTop = 1 - atlasRow / CENTER_PTABLE_ROWS;
      const vBottom = 1 - (atlasRow + 1) / CENTER_PTABLE_ROWS;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBottom + uv.getY(i) * (vTop - vBottom));
      }
      uv.needsUpdate = true;
      map[el.atomicNumber] = geom;
    });
    return map;
  }, [faceW, faceD]);

  useEffect(() => {
    return () => {
      Object.values(cellPlanes).forEach((g) => g.dispose());
    };
  }, [cellPlanes]);

  return (
    <group position={[0, 0.04, -0.35]}>
      {/* Subtle central table plinth */}
      <mesh position={[0, -0.01, 4.95]} receiveShadow>
        <boxGeometry args={[18 * cellW + 0.6, 0.06, 10.6 * cellD + 0.6]} />
        <meshStandardMaterial color="#121420" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Group 3 Markers for 57-71 & 89-103 */}
      {[
        { row: 6, labelColor: '#0E7490' },
        { row: 7, labelColor: '#BE123C' },
      ].map((slot) => {
        const x = startX + 2 * cellW;
        const z = startZ + (slot.row - 1) * cellD;
        return (
          <mesh key={`slot-${slot.row}`} position={[x, 0.04, z]} receiveShadow>
            <boxGeometry args={[faceW, 0.08, faceD]} />
            <meshStandardMaterial color={slot.labelColor} roughness={0.5} metalness={0.2} opacity={0.55} transparent />
          </mesh>
        );
      })}

      {ELEMENTS_LIST.map((el) => {
        const { col, row } = getCenterElementGridCoord(el);
        const x = startX + (col - 1) * cellW;
        const z = startZ + (row - 1) * cellD;
        const isSelected = selectedAtomicNumber === el.atomicNumber;
        const isHovered = hoveredAtomic === el.atomicNumber;

        const colorHex =
          colorMode === 'state'
            ? MATTER_STATE_META[getStateAtTemperature(el, temperatureC)].hex
            : getCategoryAccentHex(el.category);

        const boxH = isSelected ? 0.34 : isHovered ? 0.2 : 0.12;
        const centerY = boxH / 2;

        return (
          <group
            key={el.atomicNumber}
            position={[x, 0, z]}
            onClick={(e) => {
              e.stopPropagation();
              onElementSelect(el);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredAtomic(el.atomicNumber);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredAtomic((prev) => (prev === el.atomicNumber ? null : prev));
              document.body.style.cursor = 'default';
            }}
          >
            {/* Base colored plinth */}
            <mesh position={[0, centerY, 0]} castShadow receiveShadow>
              <boxGeometry args={[faceW, boxH, faceD]} />
              <meshStandardMaterial
                color={colorHex}
                emissive={colorHex}
                emissiveIntensity={isSelected ? 0.65 : isHovered ? 0.45 : 0.16}
                metalness={0.3}
                roughness={0.38}
              />
            </mesh>

            {/* Always-visible Top Label Face (Atomic #, Symbol, Name, Mass) */}
            <mesh
              geometry={cellPlanes[el.atomicNumber]}
              position={[0, boxH + 0.004, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <meshStandardMaterial
                map={atlasTexture}
                emissive="#FFFFFF"
                emissiveMap={atlasTexture}
                emissiveIntensity={isSelected ? 0.36 : 0.22}
                roughness={0.45}
                metalness={0.05}
              />
            </mesh>

            {isSelected && (
              <mesh position={[0, boxH + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[faceW * 0.48, faceW * 0.56, 4]} />
                <meshBasicMaterial color="#FF8733" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const BoardScene3D: React.FC<BoardScene3DProps> = ({
  tiles,
  teams,
  activeTeamIndex,
  properties,
  lastDice,
  isRolling,
  hopQueue,
  onHopComplete,
  colorMode,
  temperatureC,
  selectedAtomicNumber,
  cameraPreset,
  cameraTrigger,
  onTileClick,
  onElementSelect,
}) => {
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);
  const activeTeam = teams[activeTeamIndex];

  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) setWebglUnsupported(true);
    } catch {
      setWebglUnsupported(true);
    }
  }, []);

  const teamsById = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((t) => (map[t.id] = t));
    return map;
  }, [teams]);

  if (webglUnsupported) {
    return (
      <div className="w-full h-full min-h-[420px] bg-[#09090D] border border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3">
        <p className="font-display text-base font-bold text-[#F4F1EA]">
          WebGL 3D Fallback Mode Active
        </p>
        <p className="text-xs text-[#A6A9B7] max-w-md">
          Perangkat Anda saat ini tidak menyediakan akselerasi WebGL. Anda tetap dapat memainkan seluruh
          permainan melalui panel kontrol giliran, tabel periodik, dan kartu properti.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] bg-[#09090D] rounded-2xl overflow-hidden border border-white/10">
      {contextLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#09090D]/95 text-[#F4F1EA] p-6 text-center">
          <p className="font-display text-lg font-bold">WebGL Context Restoring...</p>
          <p className="text-xs text-[#A6A9B7] mt-1">Refreshing 3D laboratory surface.</p>
        </div>
      )}

      <Canvas
        shadows={!isSoftwareGl}
        dpr={[1, 2]}
        camera={{ position: [0, 27, 24.5], fov: 42, near: 0.5, far: 160 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
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
        <fog attach="fog" args={['#09090D', 48, 105]} />

        <StudioEnvironment onSoftwareGlDetected={setIsSoftwareGl} />

        <ambientLight intensity={0.48} color="#CBD5E1" />
        <directionalLight
          position={[18, 32, 16]}
          intensity={1.55}
          color="#FFF7ED"
          castShadow={!isSoftwareGl}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-18, 18, -14]} intensity={0.65} color="#93C5FD" />
        <pointLight position={[0, 14, 0]} intensity={0.75} distance={45} color="#7029FF" />

        <CameraRig
          preset={cameraPreset}
          trigger={cameraTrigger}
          activePositionIndex={activeTeam?.position ?? 0}
          inspectedAtomicNumber={selectedAtomicNumber}
          tiles={tiles}
        />

        <mesh position={[0, -0.35, 0]} receiveShadow>
          <boxGeometry args={[36.4, 0.7, 36.4]} />
          <meshStandardMaterial color="#101018" metalness={0.45} roughness={0.55} />
        </mesh>

        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[34.5, 0.16, 34.5]} />
          <meshStandardMaterial color="#1E1E2C" metalness={0.7} roughness={0.28} />
        </mesh>

        <mesh position={[0, -0.06, 0]} receiveShadow>
          <boxGeometry args={[27.2, 0.12, 27.2]} />
          <meshStandardMaterial color="#0D0D14" metalness={0.3} roughness={0.7} />
        </mesh>

        {tiles.map((tile) => {
          const ownership = properties[tile.tileId];
          const ownerColor = ownership ? teamsById[ownership.ownerTeamId]?.color : null;
          const accentHex = getTileColorHex(tile, colorMode, temperatureC);
          const isActiveTile = activeTeam?.position === tile.pathIndex;
          const isHighlighted = Boolean(
            selectedAtomicNumber && tile.atomicNumber === selectedAtomicNumber
          );

          return (
            <Tile3D
              key={tile.tileId}
              tile={tile}
              accentHex={accentHex}
              ownership={ownership}
              ownerColor={ownerColor}
              isActiveTile={isActiveTile}
              isHighlighted={isHighlighted}
              onSelect={onTileClick}
            />
          );
        })}

        <CenterPeriodicRelief3D
          colorMode={colorMode}
          temperatureC={temperatureC}
          selectedAtomicNumber={selectedAtomicNumber}
          onElementSelect={onElementSelect}
        />

        <Dice3D values={lastDice} isRolling={isRolling} />

        {teams.map((team, idx) => {
          const sameTileTeams = teams.filter((t) => !t.isBankrupt && t.position === team.position);
          const idxOnTile = sameTileTeams.findIndex((t) => t.id === team.id);
          return (
            <PlayerPiece3D
              key={team.id}
              team={team}
              teamIndex={idx}
              totalOnSameTile={Math.max(1, sameTileTeams.length)}
              indexOnSameTile={Math.max(0, idxOnTile)}
              isActive={idx === activeTeamIndex}
              hopQueue={idx === activeTeamIndex ? hopQueue : []}
              onHopComplete={idx === activeTeamIndex ? onHopComplete : undefined}
            />
          );
        })}
      </Canvas>
    </div>
  );
};
