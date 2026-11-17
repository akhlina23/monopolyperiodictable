import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChemicalElement } from '../../types/game';
import { getCategoryAccentHex } from '../../engine/gameEngine';

/**
 * Generates a crisp procedural emblem texture featuring the chemical element's
 * distinctive symbol and atomic number tinted with its chemical category accent.
 */
export function createElementEmblemTexture(symbol: string, atomicNumber: number, categoryHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0D0E14';
  ctx.fillRect(0, 0, 256, 256);

  // Category frame ring
  ctx.strokeStyle = categoryHex;
  ctx.lineWidth = 18;
  ctx.strokeRect(12, 12, 232, 232);

  // Top accent bar
  ctx.fillStyle = categoryHex;
  ctx.fillRect(20, 20, 216, 44);

  ctx.fillStyle = '#09090D';
  ctx.font = '800 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Z=${atomicNumber}`, 128, 42);

  // Large Element Symbol Emblem
  ctx.fillStyle = '#F4F1EA';
  ctx.font = '800 108px "Outfit", sans-serif';
  ctx.fillText(symbol, 128, 152);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface CompanyBuildingCluster3DProps {
  symbol: string;
  atomicNumber: number;
  categoryHex: string;
  smallCompanies: number;
  hasLargeCompany: boolean;
  scale?: number;
  autoRotate?: boolean;
}

export const CompanyBuildingCluster3D: React.FC<CompanyBuildingCluster3DProps> = ({
  symbol,
  atomicNumber,
  categoryHex,
  smallCompanies,
  hasLargeCompany,
  scale = 1,
  autoRotate = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const emblemTexture = useMemo(
    () => createElementEmblemTexture(symbol, atomicNumber, categoryHex),
    [symbol, atomicNumber, categoryHex]
  );

  useEffect(() => {
    return () => {
      emblemTexture.dispose();
    };
  }, [emblemTexture]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.45;
    }
  });

  const smallPositions: [number, number][] = useMemo(() => {
    if (smallCompanies === 1) return [[0, 0]];
    if (smallCompanies === 2) return [[-0.65, 0], [0.65, 0]];
    if (smallCompanies === 3) return [[-0.7, -0.35], [0.7, -0.35], [0, 0.65]];
    return [[-0.68, -0.58], [0.68, -0.58], [-0.68, 0.58], [0.68, 0.58]];
  }, [smallCompanies]);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Base Laboratory Pad */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[2.7, 0.1, 2.3]} />
        <meshStandardMaterial color="#1B1D28" metalness={0.45} roughness={0.5} />
      </mesh>

      {/* Border Strip in Category Color */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[2.55, 0.03, 2.15]} />
        <meshStandardMaterial color={categoryHex} emissive={categoryHex} emissiveIntensity={0.22} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Vacant Plot Indicator (0 companies) */}
      {!hasLargeCompany && smallCompanies === 0 && (
        <group position={[0, 0.32, 0]}>
          <mesh>
            <boxGeometry args={[0.95, 0.55, 0.14]} />
            <meshStandardMaterial map={emblemTexture} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.3, 12]} />
            <meshStandardMaterial color={categoryHex} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* 1 to 4 Small Element Factories */}
      {!hasLargeCompany &&
        smallCompanies > 0 &&
        smallPositions.map(([px, pz], idx) => (
          <group key={idx} position={[px, 0.02, pz]}>
            {/* Main Factory Hall tinted by Chemical Category */}
            <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.88, 0.64, 0.78]} />
              <meshStandardMaterial
                color={categoryHex}
                metalness={0.42}
                roughness={0.32}
              />
            </mesh>
            {/* Dark Structural Roof */}
            <mesh position={[0, 0.72, 0]} castShadow>
              <boxGeometry args={[0.92, 0.12, 0.82]} />
              <meshStandardMaterial color="#20222D" metalness={0.55} roughness={0.35} />
            </mesh>
            {/* Industrial Smokestack */}
            <mesh position={[0.26, 0.94, -0.22]} castShadow>
              <cylinderGeometry args={[0.07, 0.1, 0.45, 12]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.7} roughness={0.25} />
            </mesh>
            {/* Element Emblem Plaque mounted cleanly on building front */}
            <mesh position={[0, 0.38, 0.405]}>
              <planeGeometry args={[0.5, 0.5]} />
              <meshStandardMaterial map={emblemTexture} roughness={0.25} />
            </mesh>
          </group>
        ))}

      {/* Upgraded Big Company Industrial Complex */}
      {hasLargeCompany && (
        <group position={[0, 0.02, 0]}>
          {/* Main Refinery Foundation Block */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.85, 0.9, 1.45]} />
            <meshStandardMaterial color={categoryHex} metalness={0.48} roughness={0.28} />
          </mesh>

          {/* Upper Synthesis Wing */}
          <mesh position={[-0.28, 1.1, 0]} castShadow>
            <boxGeometry args={[1.05, 0.55, 1.05]} />
            <meshStandardMaterial color="#262A38" metalness={0.65} roughness={0.25} />
          </mesh>

          {/* Dual Category-Colored Reaction Silos */}
          <mesh position={[0.58, 0.95, -0.34]} castShadow>
            <cylinderGeometry args={[0.22, 0.24, 1.15, 16]} />
            <meshStandardMaterial color={categoryHex} metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0.58, 0.95, 0.34]} castShadow>
            <cylinderGeometry args={[0.22, 0.24, 1.15, 16]} />
            <meshStandardMaterial color={categoryHex} metalness={0.6} roughness={0.2} />
          </mesh>

          {/* Dome & Gold Spire Crest */}
          <mesh position={[-0.28, 1.48, 0]} castShadow>
            <sphereGeometry args={[0.32, 18, 14]} />
            <meshStandardMaterial color="#F5B942" emissive="#F5B942" emissiveIntensity={0.25} metalness={0.8} roughness={0.18} />
          </mesh>

          {/* Prominent Front & Back Element Emblem Shields */}
          <mesh position={[-0.24, 0.52, 0.74]}>
            <planeGeometry args={[0.78, 0.78]} />
            <meshStandardMaterial map={emblemTexture} roughness={0.22} />
          </mesh>
          <mesh position={[-0.24, 0.52, -0.74]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.78, 0.78]} />
            <meshStandardMaterial map={emblemTexture} roughness={0.22} />
          </mesh>
        </group>
      )}
    </group>
  );
};

interface CompanyPreviewViewportProps {
  element: ChemicalElement;
  smallCompanies: number;
  hasLargeCompany: boolean;
}

/**
 * Interactive 3D preview viewport embedded in the Property Inspection Panel (§4.5 & §9).
 */
export const CompanyPreviewViewport: React.FC<CompanyPreviewViewportProps> = ({
  element,
  smallCompanies,
  hasLargeCompany,
}) => {
  const categoryHex = getCategoryAccentHex(element.category);

  return (
    <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-[#09090D] border border-white/15">
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-2">
        <span
          style={{ borderColor: categoryHex, color: categoryHex }}
          className="px-2 py-0.5 rounded bg-[#171820]/95 border text-[10px] font-mono font-bold"
        >
          {hasLargeCompany
            ? '1 Big Industrial Complex'
            : smallCompanies > 0
            ? `${smallCompanies} Small Compan${smallCompanies > 1 ? 'ies' : 'y'}`
            : 'Vacant Element Plot'}
        </span>
      </div>

      <Canvas camera={{ position: [2.7, 2.2, 3.1], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={['#09090D']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFF7ED" />
        <directionalLight position={[-4, 4, -4]} intensity={0.65} color="#93C5FD" />
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2.2} maxDistance={6.5} />
        <CompanyBuildingCluster3D
          symbol={element.symbol}
          atomicNumber={element.atomicNumber}
          categoryHex={categoryHex}
          smallCompanies={smallCompanies}
          hasLargeCompany={hasLargeCompany}
          scale={1}
          autoRotate
        />
      </Canvas>
    </div>
  );
};
