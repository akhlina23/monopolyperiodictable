import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Dice3DProps {
  values: [number, number];
  isRolling: boolean;
}

// Target Euler rotations that place face 1..6 pointing straight +Y (upward)
function getEulerForFace(value: number): THREE.Euler {
  switch (value) {
    case 1:
      return new THREE.Euler(0, 0, 0); // +Y top
    case 2:
      return new THREE.Euler(-Math.PI / 2, 0, 0); // +Z -> +Y
    case 3:
      return new THREE.Euler(0, 0, Math.PI / 2); // +X -> +Y
    case 4:
      return new THREE.Euler(0, 0, -Math.PI / 2); // -X -> +Y
    case 5:
      return new THREE.Euler(Math.PI / 2, 0, 0); // -Z -> +Y
    case 6:
    default:
      return new THREE.Euler(Math.PI, 0, 0); // -Y -> +Y
  }
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.22, -0.22],
    [0.22, 0.22],
  ],
  3: [
    [-0.22, -0.22],
    [0, 0],
    [0.22, 0.22],
  ],
  4: [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.22],
    [0.22, 0.22],
  ],
  5: [
    [-0.22, -0.22],
    [0.22, -0.22],
    [0, 0],
    [-0.22, 0.22],
    [0.22, 0.22],
  ],
  6: [
    [-0.22, -0.24],
    [0.22, -0.24],
    [-0.22, 0],
    [0.22, 0],
    [-0.22, 0.24],
    [0.22, 0.24],
  ],
};

const SingleDie: React.FC<{
  value: number;
  basePosition: [number, number, number];
  isRolling: boolean;
  seedOffset: number;
  accentColor: string;
}> = ({ value, basePosition, isRolling, seedOffset, accentColor }) => {
  const dieRef = useRef<THREE.Group>(null);
  const targetQuat = useMemo(() => new THREE.Quaternion().setFromEuler(getEulerForFace(value)), [value]);

  useFrame((state, delta) => {
    const g = dieRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);

    if (isRolling) {
      const t = state.clock.elapsedTime;
      g.rotation.x += dt * (11 + seedOffset * 2.1);
      g.rotation.y += dt * (14 - seedOffset * 1.7);
      g.rotation.z += dt * (9 + seedOffset * 1.3);
      g.position.set(
        basePosition[0] + Math.sin(t * 14 + seedOffset) * 0.45,
        basePosition[1] + Math.abs(Math.sin(t * 11 + seedOffset)) * 1.5 + 0.35,
        basePosition[2] + Math.cos(t * 12 + seedOffset) * 0.45
      );
    } else {
      g.position.lerp(new THREE.Vector3(...basePosition), Math.min(1, dt * 12));
      g.quaternion.slerp(targetQuat, Math.min(1, dt * 12));
    }
  });

  const renderPips = (face: number, position: [number, number, number], rotation: [number, number, number]) => {
    const pts = PIP_LAYOUTS[face];
    const isOne = face === 1;
    return (
      <group position={position} rotation={rotation}>
        {pts.map(([px, py], i) => (
          <mesh key={i} position={[px, py, 0]}>
            <sphereGeometry args={[isOne ? 0.085 : 0.062, 12, 12]} />
            <meshStandardMaterial
              color={isOne ? accentColor : '#F5F5F7'}
              emissive={isOne ? accentColor : '#E2E8F0'}
              emissiveIntensity={isOne ? 0.85 : 0.35}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group ref={dieRef} position={basePosition}>
      <RoundedBox args={[0.92, 0.92, 0.92]} radius={0.14} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#1E1E2B" metalness={0.35} roughness={0.25} />
      </RoundedBox>
      {/* Face 1: +Y */}
      {renderPips(1, [0, 0.45, 0], [-Math.PI / 2, 0, 0])}
      {/* Face 6: -Y */}
      {renderPips(6, [0, -0.45, 0], [Math.PI / 2, 0, 0])}
      {/* Face 2: +Z */}
      {renderPips(2, [0, 0, 0.45], [0, 0, 0])}
      {/* Face 5: -Z */}
      {renderPips(5, [0, 0, -0.45], [0, Math.PI, 0])}
      {/* Face 3: +X */}
      {renderPips(3, [0.45, 0, 0], [0, Math.PI / 2, 0])}
      {/* Face 4: -X */}
      {renderPips(4, [-0.45, 0, 0], [0, -Math.PI / 2, 0])}
    </group>
  );
};

export const Dice3D: React.FC<Dice3DProps> = ({ values, isRolling }) => {
  return (
    <group position={[0, 0.15, 7.6]}>
      {/* Recessed Dice Rolling Arena Pad */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.55, 0.14, 32]} />
        <meshStandardMaterial color="#12121A" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.18, 2.34, 48]} />
        <meshStandardMaterial color="#7029FF" emissive="#7029FF" emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <SingleDie
        value={values[0]}
        basePosition={[-0.85, 0.5, 0.1]}
        isRolling={isRolling}
        seedOffset={0}
        accentColor="#FF8733"
      />
      <SingleDie
        value={values[1]}
        basePosition={[0.85, 0.5, -0.1]}
        isRolling={isRolling}
        seedOffset={1.9}
        accentColor="#7029FF"
      />
    </group>
  );
};
