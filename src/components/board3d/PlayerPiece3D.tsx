import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PieceType, Team } from '../../types/game';
import { TILES_BY_PATH_INDEX } from '../../engine/gameEngine';
import { getTileTransform3D } from './boardCoordinates';
import { soundManager } from '../../utils/sound';

interface PlayerPiece3DProps {
  team: Team;
  teamIndex: number;
  totalOnSameTile: number;
  indexOnSameTile: number;
  isActive: boolean;
  hopQueue: number[];
  onHopComplete?: () => void;
}

export function getPieceWorldCoordinates(
  pathIndex: number,
  totalOnSameTile = 1,
  indexOnSameTile = 0
): { x: number; y: number; z: number } {
  const tile = TILES_BY_PATH_INDEX[pathIndex];
  const tf = getTileTransform3D(tile);
  let offsetX = 0;
  let offsetZ = 0;
  if (totalOnSameTile > 1) {
    const angle = (indexOnSameTile / totalOnSameTile) * Math.PI * 2;
    offsetX = Math.cos(angle) * 0.28;
    offsetZ = Math.sin(angle) * 0.28;
  }
  return { x: tf.x + offsetX, y: 0.26, z: tf.z + offsetZ };
}

export function resolveVisualPiecePathIndex(
  logicalPosition: number,
  hopQueue: number[],
  isActive: boolean
): number {
  if (isActive && hopQueue.length > 0) {
    return hopQueue[hopQueue.length - 1];
  }
  return logicalPosition;
}

export const PlayerPiece3D: React.FC<PlayerPiece3DProps> = ({
  team,
  indexOnSameTile,
  totalOnSameTile,
  isActive,
  hopQueue,
  onHopComplete,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const atomRingsRef = useRef<THREE.Group>(null);
  const activeHopKeyRef = useRef<string>('');
  const hopKey = hopQueue.join(',');

  // Target tile world coordinates with multi-piece radial offset so pawns never collide
  const getTargetWorldPos = (pathIndex: number): THREE.Vector3 => {
    const coords = getPieceWorldCoordinates(pathIndex, totalOnSameTile, indexOnSameTile);
    return new THREE.Vector3(coords.x, coords.y, coords.z);
  };

  // Animation state stored in refs to avoid React re-renders during 60fps hop
  const animRef = useRef<{
    currentPos: THREE.Vector3;
    queue: number[];
    hopFrom: THREE.Vector3 | null;
    hopTo: THREE.Vector3 | null;
    hopProgress: number;
    notified: boolean;
  }>({
    currentPos: getTargetWorldPos(team.position),
    queue: [],
    hopFrom: null,
    hopTo: null,
    hopProgress: 0,
    notified: true,
  });

  useEffect(() => {
    if (hopQueue.length > 0 && isActive) {
      if (hopKey !== activeHopKeyRef.current) {
        activeHopKeyRef.current = hopKey;
        animRef.current.queue = [...hopQueue];
        animRef.current.hopFrom = animRef.current.currentPos.clone();
        animRef.current.hopTo = getTargetWorldPos(hopQueue[0]);
        animRef.current.hopProgress = 0;
        animRef.current.notified = false;
      }
    } else {
      activeHopKeyRef.current = '';
      animRef.current.queue = [];
      animRef.current.hopFrom = null;
      animRef.current.hopTo = null;
      animRef.current.hopProgress = 0;
      animRef.current.notified = true;
      animRef.current.currentPos.copy(getTargetWorldPos(team.position));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.position, hopKey, isActive, totalOnSameTile, indexOnSameTile]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const anim = animRef.current;
    const dt = Math.min(delta, 0.05);

    if (anim.hopTo && anim.hopFrom) {
      const hopDistance = anim.hopFrom.distanceTo(anim.hopTo);
      const isForcedTeleport = hopDistance > 4.5;
      const stepDuration = isForcedTeleport ? 0.38 : 0.16;
      const arcHeight = isForcedTeleport ? 2.1 : 0.85;

      anim.hopProgress += dt / stepDuration;
      if (anim.hopProgress >= 1) {
        anim.currentPos.copy(anim.hopTo);
        g.position.copy(anim.currentPos);
        soundManager.play(isForcedTeleport ? 'alert' : 'hop');
        anim.queue.shift();
        if (anim.queue.length > 0) {
          anim.hopFrom = anim.currentPos.clone();
          anim.hopTo = getTargetWorldPos(anim.queue[0]);
          anim.hopProgress = 0;
        } else {
          anim.hopFrom = null;
          anim.hopTo = null;
          anim.hopProgress = 0;
          if (!anim.notified) {
            anim.notified = true;
            soundManager.play('land');
            onHopComplete?.();
          }
        }
      } else {
        const t = anim.hopProgress;
        const pos = new THREE.Vector3().lerpVectors(anim.hopFrom, anim.hopTo, t);
        pos.y += Math.sin(t * Math.PI) * arcHeight;
        g.position.copy(pos);
      }
    } else {
      const desired = getTargetWorldPos(team.position);
      anim.currentPos.lerp(desired, Math.min(1, dt * 10));
      g.position.copy(anim.currentPos);
      if (isActive) {
        g.position.y += Math.sin(state.clock.elapsedTime * 3.5) * 0.06 + 0.06;
      }
    }

    // Subtle rotation for Atom orbital model or active highlight
    if (atomRingsRef.current) {
      atomRingsRef.current.rotation.y += dt * 1.4;
      atomRingsRef.current.rotation.x += dt * 0.7;
    }
  });

  const color = useMemo(() => new THREE.Color(team.color), [team.color]);

  const renderPieceGeometry = (pieceType: PieceType) => {
    switch (pieceType) {
      case 'flask':
        // Multi-part Erlenmeyer Flask (base liquid, glass cone, neck, rim, stopper)
        return (
          <group position={[0, 0.08, 0]}>
            {/* Glowing reagent liquid inside */}
            <mesh position={[0, 0.24, 0]} castShadow>
              <coneGeometry args={[0.31, 0.42, 24]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.25} metalness={0.15} />
            </mesh>
            {/* Outer borosilicate glass shell */}
            <mesh position={[0, 0.36, 0]} castShadow>
              <coneGeometry args={[0.35, 0.65, 24]} />
              <meshPhysicalMaterial
                color="#E0F2FE"
                transparent
                opacity={0.42}
                roughness={0.08}
                metalness={0.05}
                transmission={0.55}
                ior={1.47}
              />
            </mesh>
            {/* Cylindrical neck */}
            <mesh position={[0, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.12, 0.28, 20]} />
              <meshPhysicalMaterial color="#BAE6FD" transparent opacity={0.55} roughness={0.1} />
            </mesh>
            {/* Flared lip */}
            <mesh position={[0, 0.89, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.125, 0.025, 12, 24]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.6} />
            </mesh>
            {/* Metallic collar */}
            <mesh position={[0, 0.63, 0]}>
              <cylinderGeometry args={[0.135, 0.135, 0.05, 20]} />
              <meshStandardMaterial color={color} metalness={0.75} roughness={0.25} />
            </mesh>
          </group>
        );

      case 'atom':
        // Multi-part Atom Model (pedestal stem + nucleus cluster + 3 orbital rings + electrons)
        return (
          <group position={[0, 0.08, 0]}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.14, 0.32, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
            </mesh>
            <group ref={atomRingsRef} position={[0, 0.58, 0]}>
              {/* Nucleus */}
              <mesh castShadow>
                <sphereGeometry args={[0.14, 20, 20]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.4} roughness={0.2} />
              </mesh>
              {/* 3 Tilted Orbital Rings */}
              {[0, Math.PI / 3, -Math.PI / 3].map((tilt, i) => (
                <group key={i} rotation={[tilt, i * 0.7, 0.4]}>
                  <mesh>
                    <torusGeometry args={[0.34, 0.018, 10, 32]} />
                    <meshStandardMaterial color="#93C5FD" emissive="#286BFF" emissiveIntensity={0.35} metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[0.34, 0, 0]}>
                    <sphereGeometry args={[0.045, 12, 12]} />
                    <meshStandardMaterial color="#FFFFFF" emissive="#FACC15" emissiveIntensity={0.8} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        );

      case 'microscope':
        // Multi-part Laboratory Microscope (heavy base, stage, arm, barrel, eyepiece, turret)
        return (
          <group position={[0, 0.08, 0]}>
            {/* Stage */}
            <mesh position={[0.06, 0.32, 0]} castShadow>
              <boxGeometry args={[0.36, 0.05, 0.32]} />
              <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Vertical C-Arm */}
            <mesh position={[-0.14, 0.45, 0]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.1, 0.62, 0.12]} />
              <meshStandardMaterial color={color} metalness={0.65} roughness={0.28} />
            </mesh>
            {/* Optical Barrel */}
            <mesh position={[0.06, 0.66, 0]} rotation={[0, 0, -0.22]} castShadow>
              <cylinderGeometry args={[0.085, 0.095, 0.46, 20]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.85} roughness={0.18} />
            </mesh>
            {/* Eyepiece */}
            <mesh position={[0.13, 0.89, 0]} rotation={[0, 0, -0.22]}>
              <cylinderGeometry args={[0.065, 0.065, 0.12, 16]} />
              <meshStandardMaterial color="#0F172A" metalness={0.5} roughness={0.35} />
            </mesh>
            {/* Objective Lens */}
            <mesh position={[0.03, 0.43, 0]}>
              <cylinderGeometry args={[0.04, 0.025, 0.12, 14]} />
              <meshStandardMaterial color="#FACC15" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        );

      case 'goggles':
      default:
        // Multi-part Laboratory Safety Goggles (twin frames, tinted lenses, nose bridge, band)
        return (
          <group position={[0, 0.28, 0]}>
            {/* Left Lens Housing */}
            <mesh position={[-0.17, 0.1, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.12, 20]} />
              <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Left Tinted Glass */}
            <mesh position={[-0.17, 0.1, 0.145]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.115, 0.115, 0.02, 20]} />
              <meshPhysicalMaterial color="#38BDF8" transparent opacity={0.75} roughness={0.05} metalness={0.2} />
            </mesh>
            {/* Right Lens Housing */}
            <mesh position={[0.17, 0.1, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.12, 20]} />
              <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Right Tinted Glass */}
            <mesh position={[0.17, 0.1, 0.145]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.115, 0.115, 0.02, 20]} />
              <meshPhysicalMaterial color="#38BDF8" transparent opacity={0.75} roughness={0.05} metalness={0.2} />
            </mesh>
            {/* Nose Bridge */}
            <mesh position={[0, 0.12, 0.09]}>
              <boxGeometry args={[0.14, 0.05, 0.08]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Elastic Strap Arc */}
            <mesh position={[0, 0.1, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.25, 0.03, 10, 24, Math.PI]} />
              <meshStandardMaterial color="#1E293B" roughness={0.8} />
            </mesh>
          </group>
        );
    }
  };

  if (team.isBankrupt) return null;

  return (
    <group ref={groupRef}>
      {/* Team Base Pedestal */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.08, 24]} />
        <meshStandardMaterial color="#181824" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Glowing Active / Team Ring */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.34, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 1.4 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      {renderPieceGeometry(team.pieceType || 'flask')}
    </group>
  );
};
