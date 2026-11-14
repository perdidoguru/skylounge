import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnimationState, AvatarCustomization, SeatPosture } from '../../../shared/types';
import { SEAT_MAP } from '../../../shared/seats';

interface StylizedAvatarProps {
  customization: AvatarCustomization;
  animation: AnimationState;
  seatId?: string | null;
  headYaw?: number;
  headPitch?: number;
  isHost?: boolean;
  isLocal?: boolean;
  lastMessage?: {
    text: string;
    timestamp: number;
  };
  showLabel?: boolean;
  previewMode?: boolean;
}

/**
 * Reusable tilted cranium hair cap that sits high on the forehead (above eyebrows at y=0.125+)
 * while extending all the way down the back of the skull (-Z) to the nape of the neck.
 */
const CraniumHairCap: React.FC<{ material: THREE.Material }> = ({ material }) => (
  <group>
    {/* Main tilted upper-back skull cap (leaves face & eyes 100% unobstructed) */}
    <mesh
      castShadow
      material={material}
      position={[0, 0.048, -0.032]}
      rotation={[-0.58, 0, 0]}
      scale={[1.06, 1.03, 1.08]}
    >
      <sphereGeometry args={[0.236, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
    </mesh>
    {/* Nape / Lower back skull volume */}
    <mesh
      castShadow
      material={material}
      position={[0, -0.03, -0.13]}
      scale={[0.96, 0.85, 0.72]}
    >
      <sphereGeometry args={[0.175, 18, 14]} />
    </mesh>
  </group>
);

export const StylizedAvatar: React.FC<StylizedAvatarProps> = ({
  customization,
  animation,
  seatId = null,
  headYaw = 0,
  headPitch = 0,
  isHost = false,
  isLocal = false,
  lastMessage,
  showLabel = true,
  previewMode = false,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftShinRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightShinRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);

  const animClock = useRef(Math.random() * 10);

  const isFeminine =
    customization.bodyStyle === 'feminine' ||
    ['dress', 'skirt_set', 'offshoulder', 'jumpsuit'].includes(customization.outfitStyle);

  // Memoized materials for performance & consistent visual style
  const materials = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({
      color: customization.skinColor,
      roughness: 0.52,
      metalness: 0.04,
    });
    const primary = new THREE.MeshStandardMaterial({
      color: customization.primaryColor,
      roughness: 0.42,
      metalness: 0.12,
    });
    const secondary = new THREE.MeshStandardMaterial({
      color: customization.secondaryColor,
      roughness: 0.55,
      metalness: 0.08,
    });
    const hair = new THREE.MeshStandardMaterial({
      color: customization.hairColor,
      roughness: 0.38,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
    const white = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
      metalness: 0.05,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: '#111622',
      roughness: 0.28,
      metalness: 0.25,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: '#f5b851',
      roughness: 0.2,
      metalness: 0.88,
      emissive: '#593a08',
      emissiveIntensity: 0.22,
    });
    const crystal = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      roughness: 0.1,
      metalness: 0.9,
      emissive: '#38bdf8',
      emissiveIntensity: 0.25,
    });
    const blush = new THREE.MeshBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: isFeminine ? 0.38 : 0.26,
    });
    const lipTint = new THREE.MeshStandardMaterial({
      color: isFeminine ? '#e15b76' : '#261b22',
      roughness: 0.3,
      metalness: 0.08,
    });
    const glassesLens = new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.1,
      metalness: 0.85,
    });

    return {
      skin,
      primary,
      secondary,
      hair,
      white,
      dark,
      gold,
      crystal,
      blush,
      lipTint,
      glassesLens,
    };
  }, [
    customization.skinColor,
    customization.primaryColor,
    customization.secondaryColor,
    customization.hairColor,
    isFeminine,
  ]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    animClock.current += dt;
    const t = animClock.current;

    if (previewMode && rootRef.current) {
      rootRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.38;
    }

    const hips = hipsRef.current;
    const spine = spineRef.current;
    const head = headGroupRef.current;
    const lArm = leftArmRef.current;
    const lFore = leftForearmRef.current;
    const rArm = rightArmRef.current;
    const rFore = rightForearmRef.current;
    const lLeg = leftLegRef.current;
    const lShin = leftShinRef.current;
    const rLeg = rightLegRef.current;
    const rShin = rightShinRef.current;

    if (
      !hips ||
      !spine ||
      !head ||
      !lArm ||
      !lFore ||
      !rArm ||
      !rFore ||
      !lLeg ||
      !lShin ||
      !rLeg ||
      !rShin
    ) {
      return;
    }

    // Target pose variables
    let hipsY = 0.72;
    let hipsZ = 0;
    let hipsRotX = 0;
    let hipsRotY = 0;
    let spineRotX = 0;
    let spineRotZ = 0;
    let headRotY = headYaw;
    let headRotX = headPitch;
    let headRotZ = 0;

    let lArmX = 0;
    let lArmZ = isFeminine ? 0.09 : 0.12;
    let lForeX = -0.15;
    let lForeZ = 0;

    let rArmX = 0;
    let rArmZ = isFeminine ? -0.09 : -0.12;
    let rForeX = -0.15;
    let rForeZ = 0;

    let lLegX = 0;
    let lLegY = 0;
    let lLegZ = 0;
    let lShinX = 0;

    let rLegX = 0;
    let rLegY = 0;
    let rLegZ = 0;
    let rShinX = 0;

    const dampSpeed = 12;

    switch (animation) {
      case 'idle': {
        const breath = Math.sin(t * 2.1);
        hipsY = 0.72 + breath * 0.012;
        spineRotX = breath * 0.025;
        spineRotZ = Math.cos(t * 1.1) * (isFeminine ? 0.026 : 0.018);
        hipsRotY = isFeminine ? Math.sin(t * 1.1) * 0.04 : 0;
        lArmX = Math.sin(t * 1.5) * 0.04;
        rArmX = -Math.sin(t * 1.5) * 0.04;
        lArmZ = (isFeminine ? 0.09 : 0.12) + breath * 0.015;
        rArmZ = -(isFeminine ? 0.09 : 0.12) - breath * 0.015;
        headRotY = headYaw + Math.sin(t * 0.8) * 0.05;
        headRotX = headPitch + Math.cos(t * 1.3) * 0.03;
        break;
      }

      case 'walk': {
        const w = t * 8.5;
        hipsY = 0.72 + Math.abs(Math.cos(w)) * 0.045;
        hipsRotY = Math.sin(w) * (isFeminine ? 0.12 : 0.08);
        spineRotX = 0.05;
        spineRotZ = Math.cos(w) * (isFeminine ? 0.045 : 0.03);

        lLegX = Math.sin(w) * 0.56;
        rLegX = -Math.sin(w) * 0.56;
        lShinX = Math.max(0, -Math.cos(w) * 0.55);
        rShinX = Math.max(0, Math.cos(w) * 0.55);

        lArmX = -Math.sin(w) * 0.42;
        rArmX = Math.sin(w) * 0.42;
        lForeX = -0.26 - Math.max(0, -Math.sin(w)) * 0.22;
        rForeX = -0.26 - Math.max(0, Math.sin(w)) * 0.22;
        break;
      }

      case 'run': {
        const r = t * 13.5;
        hipsY = 0.71 + Math.abs(Math.cos(r)) * 0.075;
        hipsRotY = Math.sin(r) * 0.14;
        spineRotX = 0.18;
        spineRotZ = Math.cos(r) * 0.05;

        lLegX = Math.sin(r) * 0.92;
        rLegX = -Math.sin(r) * 0.92;
        lShinX = Math.max(0.1, -Math.cos(r) * 0.95);
        rShinX = Math.max(0.1, Math.cos(r) * 0.95);

        lArmX = -Math.sin(r) * 0.82;
        rArmX = Math.sin(r) * 0.82;
        lForeX = -0.85;
        rForeX = -0.85;
        headRotX = headPitch - 0.1;
        break;
      }

      case 'jump': {
        hipsY = 0.82;
        spineRotX = -0.08;
        lLegX = -0.35;
        lShinX = 0.65;
        rLegX = 0.22;
        rShinX = 0.45;
        lArmX = -0.65;
        rArmX = -0.65;
        lArmZ = 0.35;
        rArmZ = -0.35;
        break;
      }

      case 'sit': {
        const breath = Math.sin(t * 1.8);
        const posture: SeatPosture = (seatId && SEAT_MAP[seatId]?.posture) || 'sofa';

        if (posture === 'sofa') {
          // 1. SOFA: Relaxed cinema sofa lean, one hand in lap, one arm resting on sofa cushion
          hipsY = 0.44;
          hipsZ = -0.06;
          spineRotX = -0.14 + breath * 0.015;
          lLegX = -1.46;
          lShinX = 1.38;
          rLegX = -1.46;
          rShinX = 1.38;
          lLegZ = isFeminine ? -0.04 : 0.06;
          rLegZ = isFeminine ? 0.04 : -0.06;

          lArmX = -0.42;
          lArmZ = 0.06;
          lForeX = -0.65;
          lForeZ = -0.28;

          rArmX = -0.22;
          rArmZ = -0.28;
          rForeX = -0.45;
          headRotY = headYaw + Math.sin(t * 0.6) * 0.04;
          headRotX = headPitch + Math.sin(t * 1.2) * 0.025;
        } else if (posture === 'chaise') {
          // 2. CHAISE LONGUE: Deep lounge recline with legs stretched out and ankles crossed
          hipsY = 0.42;
          hipsZ = -0.11;
          spineRotX = -0.28 + breath * 0.014;
          lLegX = -1.22;
          lShinX = 0.28;
          lLegZ = -0.06;
          rLegX = -1.28;
          rShinX = 0.36;
          rLegZ = 0.12;

          lArmX = -0.18;
          lArmZ = 0.36;
          lForeX = -0.45;
          rArmX = -0.38;
          rArmZ = -0.12;
          rForeX = -0.62;
          headRotZ = 0.04;
          headRotY = headYaw + Math.sin(t * 0.5) * 0.04;
        } else if (posture === 'pouf') {
          // 3. VELVET POUF: Cozy forward-leaning cinema watch pose, elbows resting on knees & hands near chin
          hipsY = 0.42;
          hipsZ = 0.02;
          spineRotX = 0.22 + breath * 0.016;
          lLegX = -1.52;
          lShinX = 1.46;
          rLegX = -1.52;
          rShinX = 1.46;
          lLegZ = 0.08;
          rLegZ = -0.08;

          lArmX = -0.92;
          rArmX = -0.92;
          lArmZ = 0.08;
          rArmZ = -0.08;
          lForeX = -1.22;
          rForeX = -1.22;
          lForeZ = -0.18;
          rForeZ = 0.18;
          headRotX = headPitch - 0.16 + Math.sin(t * 1.4) * 0.03;
        } else if (posture === 'cushion') {
          // 4. FLOOR CUSHION: Cross-legged lotus zen sit on the low floor pillow
          hipsY = 0.28;
          hipsZ = -0.02;
          spineRotX = -0.03 + breath * 0.018;
          spineRotZ = Math.sin(t * 1.1) * 0.028;

          lLegX = -1.32;
          lLegZ = 0.56;
          lLegY = 0.32;
          lShinX = 1.58;

          rLegX = -1.32;
          rLegZ = -0.56;
          rLegY = -0.32;
          rShinX = 1.58;

          lArmX = -0.36;
          rArmX = -0.36;
          lArmZ = 0.22;
          rArmZ = -0.22;
          lForeX = -0.52;
          rForeX = -0.52;
          headRotY = headYaw + Math.sin(t * 0.7) * 0.05;
        } else if (posture === 'vip') {
          // 5. VIP PANORAMIC SOFA: Confident figure-4 / crossed-leg executive pose with arms draped wide
          hipsY = 0.44;
          hipsZ = -0.08;
          spineRotX = -0.22 + breath * 0.014;

          lLegX = -1.46;
          lShinX = 1.4;
          rLegX = -1.68;
          rLegZ = 0.22;
          rLegY = -0.24;
          rShinX = 1.32;

          lArmX = -0.14;
          lArmZ = 0.68;
          lForeX = -0.32;
          rArmX = -0.14;
          rArmZ = -0.68;
          rForeX = -0.32;
          headRotY = headYaw + Math.sin(t * 0.5) * 0.05;
        } else if (posture === 'armchair') {
          // 6. SUNSET READING ARMCHAIR: Elegant crossed-leg conversational pose with thoughtful hand gesture
          hipsY = 0.44;
          hipsZ = -0.05;
          spineRotX = -0.1 + breath * 0.015;
          spineRotZ = 0.04;

          lLegX = -1.48;
          lLegZ = -0.06;
          lShinX = 1.38;
          rLegX = -1.62;
          rLegZ = 0.14;
          rShinX = 1.26;

          lArmX = -0.45;
          lArmZ = 0.08;
          lForeX = -0.72;
          lForeZ = -0.32;

          rArmX = -0.75;
          rArmZ = -0.06;
          rForeX = -1.32 + Math.sin(t * 1.6) * 0.07;
          rForeZ = 0.15;
          headRotZ = -0.05;
          headRotY = headYaw + Math.sin(t * 0.8) * 0.06;
        } else if (posture === 'barstool') {
          // 7. SKYBAR HIGH STOOL: High perch, one foot hooked on footrest ring, other leg dangling with rhythm sway
          hipsY = 0.5;
          hipsZ = 0.02;
          spineRotX = 0.06 + breath * 0.015;
          spineRotZ = Math.sin(t * 1.4) * 0.03;

          lLegX = -1.24;
          lShinX = 1.48;
          rLegX = -0.68;
          rShinX = 0.52 + Math.sin(t * 2.2) * 0.08;

          lArmX = -0.68;
          lArmZ = 0.12;
          lForeX = -0.82;
          rArmX = -0.64;
          rArmZ = -0.14;
          rForeX = -0.9 + Math.sin(t * 1.8) * 0.06;
          headRotY = headYaw + Math.sin(t * 0.9) * 0.06;
        }
        break;
      }

      case 'wave': {
        const waveCycle = t * 9.5;
        hipsY = 0.72 + Math.sin(t * 2.5) * 0.015;
        spineRotZ = 0.06;
        rArmX = -2.35;
        rArmZ = -0.35 + Math.sin(waveCycle) * 0.28;
        rForeX = -0.45 + Math.cos(waveCycle) * 0.22;
        lArmX = 0.08;
        lArmZ = 0.15;
        headRotZ = -0.08;
        headRotY = Math.sin(t * 2) * 0.1;
        break;
      }

      case 'dance': {
        const beat = t * 7.2;
        hipsY = 0.68 + Math.abs(Math.sin(beat)) * 0.07;
        hipsRotY = Math.sin(beat) * 0.28;
        spineRotZ = Math.sin(beat * 0.5) * 0.14;
        spineRotX = Math.cos(beat) * 0.08;

        lLegX = Math.sin(beat) * 0.35;
        rLegX = -Math.sin(beat) * 0.35;
        lShinX = Math.max(0, Math.cos(beat) * 0.45);
        rShinX = Math.max(0, -Math.cos(beat) * 0.45);

        lArmX = -1.4 + Math.sin(beat) * 0.65;
        rArmX = -1.4 - Math.sin(beat) * 0.65;
        lArmZ = 0.45 + Math.cos(beat * 0.5) * 0.25;
        rArmZ = -0.45 - Math.cos(beat * 0.5) * 0.25;
        lForeX = -0.65 + Math.sin(beat * 2) * 0.25;
        rForeX = -0.65 - Math.sin(beat * 2) * 0.25;

        headRotY = Math.sin(beat * 0.5) * 0.22;
        headRotZ = Math.cos(beat) * 0.1;
        break;
      }

      case 'cheer': {
        const pump = t * 9.0;
        hipsY = 0.73 + Math.abs(Math.sin(pump)) * 0.065;
        spineRotX = -0.1;
        lArmX = -2.6 + Math.sin(pump) * 0.3;
        rArmX = -2.6 - Math.sin(pump) * 0.3;
        lArmZ = 0.32;
        rArmZ = -0.32;
        lForeX = -0.25;
        rForeX = -0.25;
        headRotX = -0.15 + Math.sin(pump) * 0.08;
        break;
      }

      case 'laugh': {
        const chuckle = t * 14.0;
        hipsY = 0.71;
        spineRotX = 0.14 + Math.sin(chuckle) * 0.05;
        lArmX = -0.55;
        rArmX = -0.55;
        lForeX = -0.9;
        rForeX = -0.9;
        headRotX = -0.12 + Math.sin(chuckle) * 0.07;
        break;
      }
    }

    // Smooth Damping for all joints
    hips.position.y = THREE.MathUtils.damp(hips.position.y, hipsY, dampSpeed, dt);
    hips.position.z = THREE.MathUtils.damp(hips.position.z, hipsZ, dampSpeed, dt);
    hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, hipsRotX, dampSpeed, dt);
    hips.rotation.y = THREE.MathUtils.damp(hips.rotation.y, hipsRotY, dampSpeed, dt);

    spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, spineRotX, dampSpeed, dt);
    spine.rotation.z = THREE.MathUtils.damp(spine.rotation.z, spineRotZ, dampSpeed, dt);

    head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headRotY, dampSpeed, dt);
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, headRotX, dampSpeed, dt);
    head.rotation.z = THREE.MathUtils.damp(head.rotation.z, headRotZ, dampSpeed, dt);

    lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, lArmX, dampSpeed, dt);
    lArm.rotation.z = THREE.MathUtils.damp(lArm.rotation.z, lArmZ, dampSpeed, dt);
    lFore.rotation.x = THREE.MathUtils.damp(lFore.rotation.x, lForeX, dampSpeed, dt);
    lFore.rotation.z = THREE.MathUtils.damp(lFore.rotation.z, lForeZ, dampSpeed, dt);

    rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, rArmX, dampSpeed, dt);
    rArm.rotation.z = THREE.MathUtils.damp(rArm.rotation.z, rArmZ, dampSpeed, dt);
    rFore.rotation.x = THREE.MathUtils.damp(rFore.rotation.x, rForeX, dampSpeed, dt);
    rFore.rotation.z = THREE.MathUtils.damp(rFore.rotation.z, rForeZ, dampSpeed, dt);

    lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, lLegX, dampSpeed, dt);
    lLeg.rotation.y = THREE.MathUtils.damp(lLeg.rotation.y, lLegY, dampSpeed, dt);
    lLeg.rotation.z = THREE.MathUtils.damp(lLeg.rotation.z, lLegZ, dampSpeed, dt);
    lShin.rotation.x = THREE.MathUtils.damp(lShin.rotation.x, lShinX, dampSpeed, dt);

    rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, rLegX, dampSpeed, dt);
    rLeg.rotation.y = THREE.MathUtils.damp(rLeg.rotation.y, rLegY, dampSpeed, dt);
    rLeg.rotation.z = THREE.MathUtils.damp(rLeg.rotation.z, rLegZ, dampSpeed, dt);
    rShin.rotation.x = THREE.MathUtils.damp(rShin.rotation.x, rShinX, dampSpeed, dt);

    // Periodic natural eye blink
    const blinkCycle = t % 4.2;
    const blinkScaleY = blinkCycle > 4.04 ? 0.12 : 1.0;
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = THREE.MathUtils.damp(leftEyeRef.current.scale.y, blinkScaleY, 28, dt);
      rightEyeRef.current.scale.y = THREE.MathUtils.damp(rightEyeRef.current.scale.y, blinkScaleY, 28, dt);
    }
  });

  // Check if speech bubble is recent (within last 7 seconds)
  const activeBubbleText = useMemo(() => {
    if (!lastMessage?.text) return null;
    if (Date.now() - lastMessage.timestamp > 7500) return null;
    return lastMessage.text;
  }, [lastMessage]);

  const hasSkirt =
    customization.outfitStyle === 'dress' || customization.outfitStyle === 'skirt_set';

  return (
    <group ref={rootRef}>
      {/* Subtle ground contact shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.36, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* HIPS ROOT */}
      <group ref={hipsRef} position={[0, 0.72, 0]}>
        {/* Pelvis / Hip Sculpt */}
        <mesh
          castShadow
          receiveShadow
          material={customization.outfitStyle === 'dress' ? materials.primary : materials.secondary}
          position={[0, 0, 0]}
          scale={isFeminine ? [1.06, 0.95, 1.02] : [1, 1, 1]}
        >
          <capsuleGeometry args={[0.17, 0.1, 8, 16]} />
        </mesh>

        {/* Flared Skirt for 'dress' and 'skirt_set' outfits */}
        {hasSkirt && (
          <group position={[0, -0.08, 0]}>
            <mesh
              castShadow
              receiveShadow
              material={
                customization.outfitStyle === 'dress' ? materials.primary : materials.secondary
              }
            >
              <cylinderGeometry args={[0.175, 0.285, 0.28, 24]} />
            </mesh>
            {/* Gold Hem Trim */}
            <mesh castShadow material={materials.gold} position={[0, -0.135, 0]}>
              <cylinderGeometry args={[0.286, 0.288, 0.02, 24]} />
            </mesh>
          </group>
        )}

        {/* Belt & Gold Buckle */}
        <mesh castShadow material={materials.dark} position={[0, 0.035, 0]}>
          <cylinderGeometry args={[isFeminine ? 0.168 : 0.182, isFeminine ? 0.172 : 0.182, 0.04, 20]} />
        </mesh>
        <mesh castShadow material={materials.gold} position={[0, 0.035, isFeminine ? 0.168 : 0.18]}>
          <boxGeometry args={[0.065, 0.045, 0.02]} />
        </mesh>

        {/* SPINE & UPPER BODY */}
        <group ref={spineRef} position={[0, 0.06, 0]}>
          {/* Main Torso Sculpt (Tapered waist for feminine silhouette) */}
          <mesh castShadow receiveShadow material={materials.primary} position={[0, 0.24, 0]}>
            <cylinderGeometry
              args={[isFeminine ? 0.192 : 0.21, isFeminine ? 0.148 : 0.175, 0.44, 20]}
            />
          </mesh>

          {/* Rounded Shoulder Bridge */}
          <mesh
            castShadow
            receiveShadow
            material={
              customization.outfitStyle === 'offshoulder' || customization.outfitStyle === 'dress'
                ? materials.skin
                : materials.primary
            }
            position={[0, 0.43, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <capsuleGeometry args={[isFeminine ? 0.098 : 0.11, isFeminine ? 0.21 : 0.24, 8, 16]} />
          </mesh>

          {/* OUTFIT DETAILS BY STYLE */}
          {customization.outfitStyle === 'jacket' && (
            <group>
              <mesh castShadow material={materials.white} position={[0, 0.27, 0.165]}>
                <boxGeometry args={[0.12, 0.36, 0.08]} />
              </mesh>
              <mesh castShadow material={materials.secondary} position={[0, 0.48, -0.01]}>
                <torusGeometry args={[0.135, 0.035, 10, 20, Math.PI * 1.35]} />
              </mesh>
              <mesh castShadow material={materials.gold} position={[0.065, 0.25, 0.195]}>
                <boxGeometry args={[0.014, 0.38, 0.02]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'hoodie' && (
            <group>
              <mesh
                castShadow
                material={materials.primary}
                position={[0, 0.48, -0.14]}
                rotation={[0.4, 0, 0]}
              >
                <sphereGeometry args={[0.16, 16, 12]} />
              </mesh>
              <mesh castShadow material={materials.secondary} position={[0, 0.14, 0.17]}>
                <boxGeometry args={[0.2, 0.13, 0.06]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[-0.05, 0.36, 0.19]}>
                <capsuleGeometry args={[0.01, 0.12, 4, 8]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0.05, 0.36, 0.19]}>
                <capsuleGeometry args={[0.01, 0.12, 4, 8]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'blazer' && (
            <group>
              <mesh castShadow material={materials.white} position={[0, 0.32, 0.16]}>
                <boxGeometry args={[0.13, 0.28, 0.07]} />
              </mesh>
              <mesh
                castShadow
                material={materials.secondary}
                position={[-0.07, 0.33, 0.185]}
                rotation={[0, 0, -0.22]}
              >
                <boxGeometry args={[0.048, 0.26, 0.03]} />
              </mesh>
              <mesh
                castShadow
                material={materials.secondary}
                position={[0.07, 0.33, 0.185]}
                rotation={[0, 0, 0.22]}
              >
                <boxGeometry args={[0.048, 0.26, 0.03]} />
              </mesh>
              <mesh castShadow material={materials.gold} position={[0.1, 0.35, 0.185]}>
                <boxGeometry args={[0.05, 0.028, 0.025]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'vest' && (
            <group>
              <mesh castShadow material={materials.secondary} position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.22, 0.21, 0.11, 20]} />
              </mesh>
              <mesh castShadow material={materials.secondary} position={[0, 0.23, 0]}>
                <cylinderGeometry args={[0.21, 0.195, 0.11, 20]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.195, 0.175, 0.1, 20]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'dress' && (
            <group>
              {/* Sweetheart Bodice Accent & Gold Neckline */}
              <mesh castShadow material={materials.gold} position={[0, 0.42, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.11, 0.014, 8, 20]} />
              </mesh>
              <mesh castShadow material={materials.secondary} position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.158, 0.165, 0.07, 20]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'skirt_set' && (
            <group>
              {/* Cropped Jacket Collar & White Crop Top */}
              <mesh castShadow material={materials.white} position={[0, 0.24, 0.152]}>
                <boxGeometry args={[0.14, 0.26, 0.06]} />
              </mesh>
              <mesh castShadow material={materials.gold} position={[0, 0.39, 0.17]}>
                <sphereGeometry args={[0.02, 10, 10]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'offshoulder' && (
            <group>
              {/* Folded Bardot Off-Shoulder Knit Collar */}
              <mesh
                castShadow
                material={materials.secondary}
                position={[0, 0.37, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <torusGeometry args={[0.195, 0.042, 12, 24]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'jumpsuit' && (
            <group>
              {/* Deep V-Neck & Gold Statement Necklace */}
              <mesh castShadow material={materials.skin} position={[0, 0.36, 0.155]}>
                <boxGeometry args={[0.09, 0.16, 0.06]} />
              </mesh>
              <mesh castShadow material={materials.gold} position={[0, 0.41, 0.13]} rotation={[0.9, 0, 0]}>
                <torusGeometry args={[0.105, 0.014, 8, 20, Math.PI]} />
              </mesh>
            </group>
          )}

          {/* NECK */}
          <mesh castShadow material={materials.skin} position={[0, 0.52, 0]}>
            <cylinderGeometry args={[isFeminine ? 0.068 : 0.075, isFeminine ? 0.078 : 0.085, 0.12, 16]} />
          </mesh>

          {/* HEAD & EXPRESSIVE FACE */}
          <group ref={headGroupRef} position={[0, 0.74, 0]}>
            {/* Sculpted Head Sphere */}
            <mesh castShadow receiveShadow material={materials.skin} scale={[1.0, 0.96, 0.96]}>
              <sphereGeometry args={[0.235, 28, 24]} />
            </mesh>

            {/* Ears */}
            <mesh
              castShadow
              material={materials.skin}
              position={[-0.23, -0.01, 0]}
              scale={[0.45, 0.8, 0.6]}
            >
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>
            <mesh
              castShadow
              material={materials.skin}
              position={[0.23, -0.01, 0]}
              scale={[0.45, 0.8, 0.6]}
            >
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>

            {/* Cute Button Nose */}
            <mesh castShadow material={materials.skin} position={[0, -0.015, 0.23]}>
              <sphereGeometry args={[isFeminine ? 0.022 : 0.026, 12, 12]} />
            </mesh>

            {/* Cheek Blush */}
            <mesh
              material={materials.blush}
              position={[-0.11, -0.042, 0.203]}
              rotation={[0, -0.35, 0]}
            >
              <circleGeometry args={[isFeminine ? 0.042 : 0.034, 16]} />
            </mesh>
            <mesh
              material={materials.blush}
              position={[0.11, -0.042, 0.203]}
              rotation={[0, 0.35, 0]}
            >
              <circleGeometry args={[isFeminine ? 0.042 : 0.034, 16]} />
            </mesh>

            {/* Left Eye Assembly */}
            <group ref={leftEyeRef} position={[-0.082, 0.025, 0.208]} rotation={[0, -0.2, 0]}>
              <mesh material={materials.white} scale={[0.85, 1.1, 0.4]}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>
              <mesh material={materials.dark} position={[0, 0, 0.012]} scale={[0.85, 1.05, 0.35]}>
                <sphereGeometry args={[0.025, 14, 14]} />
              </mesh>
              {/* Eye Catchlight Sparkle */}
              <mesh material={materials.white} position={[0.008, 0.01, 0.022]}>
                <sphereGeometry args={[0.007, 8, 8]} />
              </mesh>
              {/* Feminine Winged Eyelashes */}
              {isFeminine && (
                <group>
                  <mesh
                    material={materials.dark}
                    position={[-0.006, 0.033, 0.012]}
                    rotation={[0, 0, 0.22]}
                  >
                    <capsuleGeometry args={[0.0055, 0.042, 4, 8]} />
                  </mesh>
                  <mesh
                    material={materials.dark}
                    position={[-0.032, 0.028, 0.01]}
                    rotation={[0, 0, 0.65]}
                  >
                    <coneGeometry args={[0.007, 0.024, 6]} />
                  </mesh>
                </group>
              )}
            </group>

            {/* Right Eye Assembly */}
            <group ref={rightEyeRef} position={[0.082, 0.025, 0.208]} rotation={[0, 0.2, 0]}>
              <mesh material={materials.white} scale={[0.85, 1.1, 0.4]}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>
              <mesh material={materials.dark} position={[0, 0, 0.012]} scale={[0.85, 1.05, 0.35]}>
                <sphereGeometry args={[0.025, 14, 14]} />
              </mesh>
              {/* Eye Catchlight Sparkle */}
              <mesh material={materials.white} position={[0.008, 0.01, 0.022]}>
                <sphereGeometry args={[0.007, 8, 8]} />
              </mesh>
              {/* Feminine Winged Eyelashes */}
              {isFeminine && (
                <group>
                  <mesh
                    material={materials.dark}
                    position={[0.006, 0.033, 0.012]}
                    rotation={[0, 0, -0.22]}
                  >
                    <capsuleGeometry args={[0.0055, 0.042, 4, 8]} />
                  </mesh>
                  <mesh
                    material={materials.dark}
                    position={[0.032, 0.028, 0.01]}
                    rotation={[0, 0, -0.65]}
                  >
                    <coneGeometry args={[0.007, 0.024, 6]} />
                  </mesh>
                </group>
              )}
            </group>

            {/* Eyebrows (Always cleanly visible below the hairline!) */}
            <mesh
              material={materials.hair}
              position={[-0.085, 0.084, 0.208]}
              rotation={[0, -0.2, isFeminine ? 0.16 : 0.08]}
            >
              <capsuleGeometry args={[isFeminine ? 0.0065 : 0.0085, 0.042, 4, 8]} />
            </mesh>
            <mesh
              material={materials.hair}
              position={[0.085, 0.084, 0.208]}
              rotation={[0, 0.2, isFeminine ? -0.16 : -0.08]}
            >
              <capsuleGeometry args={[isFeminine ? 0.0065 : 0.0085, 0.042, 4, 8]} />
            </mesh>

            {/* Expressive Smile / Lips */}
            <mesh
              material={materials.lipTint}
              position={[0, -0.072, 0.214]}
              rotation={[Math.PI * 0.95, 0, 0]}
            >
              <torusGeometry args={[0.026, isFeminine ? 0.0075 : 0.006, 8, 16, Math.PI]} />
            </mesh>

            {/* ===================================================================
                9 RE-SCULPTED 3D HAIRSTYLES (NEVER COVER THE EYES OR FACE!)
                =================================================================== */}

            {/* 1. SPIKY / MODERN TEXTURED CROP (Smooth sculpted locks swept up above forehead) */}
            {customization.hairStyle === 'spiky' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Sculpted Upward Pompadour / Textured Locks (High at y=0.19..0.24) */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, 0.21, 0.11]}
                  rotation={[-0.35, 0, 0.15]}
                  scale={[1.1, 0.65, 1.4]}
                >
                  <sphereGeometry args={[0.095, 16, 14]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.095, 0.19, 0.09]}
                  rotation={[-0.25, 0.2, 0.45]}
                  scale={[0.9, 0.6, 1.3]}
                >
                  <sphereGeometry args={[0.085, 14, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.095, 0.19, 0.09]}
                  rotation={[-0.25, -0.2, -0.45]}
                  scale={[0.9, 0.6, 1.3]}
                >
                  <sphereGeometry args={[0.085, 14, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, 0.23, -0.02]}
                  rotation={[0.2, 0, 0]}
                  scale={[1.2, 0.65, 1.3]}
                >
                  <sphereGeometry args={[0.105, 16, 14]} />
                </mesh>
              </group>
            )}

            {/* 2. BOB / CYBER CHIC BOB (Frames the jaw cleanly on the sides, high side-part fringe) */}
            {customization.hairStyle === 'bob' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Left & Right Sleek Chin-Length Bob Panels (Outside the face at x = ±0.215) */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.215, -0.02, 0.01]}
                  rotation={[0.08, 0, 0.08]}
                  scale={[0.55, 1.15, 0.95]}
                >
                  <capsuleGeometry args={[0.095, 0.16, 10, 14]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.215, -0.02, 0.01]}
                  rotation={[0.08, 0, -0.08]}
                  scale={[0.55, 1.15, 0.95]}
                >
                  <capsuleGeometry args={[0.095, 0.16, 10, 14]} />
                </mesh>
                {/* High Side-Swept Fringe (Sits at y=0.165, well above eyebrows at y=0.084!) */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.05, 0.168, 0.175]}
                  rotation={[0.15, -0.22, -1.25]}
                >
                  <capsuleGeometry args={[0.042, 0.14, 8, 12]} />
                </mesh>
              </group>
            )}

            {/* 3. CURLY / VOLUMINOUS AFRO PUFF (Full base cap + high crown curl clusters) */}
            {customization.hairStyle === 'curly' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {[
                  [0, 0.23, 0.05, 0.115],
                  [-0.13, 0.2, 0.04, 0.105],
                  [0.13, 0.2, 0.04, 0.105],
                  [-0.2, 0.11, -0.03, 0.1],
                  [0.2, 0.11, -0.03, 0.1],
                  [0, 0.22, -0.11, 0.12],
                  [-0.13, 0.14, -0.15, 0.105],
                  [0.13, 0.14, -0.15, 0.105],
                  [0, 0.05, -0.2, 0.11],
                  [-0.07, 0.19, 0.13, 0.078],
                  [0.07, 0.19, 0.13, 0.078],
                ].map(([x, y, z, r], idx) => (
                  <mesh key={idx} castShadow material={materials.hair} position={[x, y, z]}>
                    <sphereGeometry args={[r, 14, 14]} />
                  </mesh>
                ))}
              </group>
            )}

            {/* 4. PONYTAIL / SLEEK HIGH PONYTAIL (Cascading curved tail at the back) */}
            {customization.hairStyle === 'ponytail' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* High Side-Part Temple Sweeps */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.08, 0.17, 0.165]}
                  rotation={[0.1, 0.25, 1.15]}
                >
                  <capsuleGeometry args={[0.038, 0.11, 8, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.08, 0.17, 0.165]}
                  rotation={[0.1, -0.25, -1.15]}
                >
                  <capsuleGeometry args={[0.038, 0.11, 8, 12]} />
                </mesh>
                {/* Gold Scrunchie Ring */}
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[0, 0.12, -0.23]}
                  rotation={[0.45, 0, 0]}
                >
                  <torusGeometry args={[0.052, 0.018, 10, 18]} />
                </mesh>
                {/* Flowing Multi-Segment Ponytail */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, 0.05, -0.31]}
                  rotation={[0.55, 0, 0]}
                >
                  <capsuleGeometry args={[0.078, 0.18, 10, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, -0.12, -0.35]}
                  rotation={[0.15, 0, 0]}
                >
                  <capsuleGeometry args={[0.062, 0.18, 10, 16]} />
                </mesh>
              </group>
            )}

            {/* 5. WAVES / MEDIUM LAYERED WOLF CUT */}
            {customization.hairStyle === 'waves' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* High Swept Forehead Wave */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.04, 0.19, 0.14]}
                  rotation={[0.2, 0.25, -1.1]}
                >
                  <capsuleGeometry args={[0.055, 0.16, 8, 14]} />
                </mesh>
                {/* Layered Side Waves Behind Ears */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.21, -0.05, -0.06]}
                  rotation={[0.18, 0, 0.15]}
                >
                  <capsuleGeometry args={[0.065, 0.22, 8, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.21, -0.05, -0.06]}
                  rotation={[0.18, 0, -0.15]}
                >
                  <capsuleGeometry args={[0.065, 0.22, 8, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, -0.08, -0.18]}
                  scale={[1.2, 1.0, 0.65]}
                >
                  <capsuleGeometry args={[0.11, 0.18, 8, 12]} />
                </mesh>
              </group>
            )}

            {/* 6. LONG WAVES (FEMININE) — Glamorous Long Wavy Hair Flowing Over Shoulders & Back */}
            {customization.hairStyle === 'long_waves' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Curtain Bangs Framing the Forehead High & Wide */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.1, 0.168, 0.162]}
                  rotation={[0.15, 0.3, 1.05]}
                >
                  <capsuleGeometry args={[0.042, 0.13, 8, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.1, 0.168, 0.162]}
                  rotation={[0.15, -0.3, -1.05]}
                >
                  <capsuleGeometry args={[0.042, 0.13, 8, 12]} />
                </mesh>
                {/* Left & Right Front Shoulder Cascades */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.2, -0.14, 0.04]}
                  rotation={[-0.08, 0, 0.08]}
                >
                  <capsuleGeometry args={[0.058, 0.34, 10, 14]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.2, -0.14, 0.04]}
                  rotation={[-0.08, 0, -0.08]}
                >
                  <capsuleGeometry args={[0.058, 0.34, 10, 14]} />
                </mesh>
                {/* Full Flowing Back Hair Mantle */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, -0.16, -0.17]}
                  rotation={[0.12, 0, 0]}
                  scale={[1.35, 1.0, 0.55]}
                >
                  <capsuleGeometry args={[0.15, 0.36, 12, 16]} />
                </mesh>
              </group>
            )}

            {/* 7. LONG STRAIGHT (FEMININE) — Sleek Long Straight Hair with High Side Fringe */}
            {customization.hairStyle === 'long_straight' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Delicate High Forehead Fringe (Above Eyebrows at y=0.162) */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, 0.165, 0.175]}
                  rotation={[0.12, 0, Math.PI / 2]}
                  scale={[0.85, 1.0, 0.55]}
                >
                  <capsuleGeometry args={[0.042, 0.21, 8, 12]} />
                </mesh>
                {/* Sleek Side Strands Framing Jawline */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.215, -0.15, 0.02]}
                  scale={[0.5, 1.0, 0.85]}
                >
                  <capsuleGeometry args={[0.075, 0.38, 10, 14]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.215, -0.15, 0.02]}
                  scale={[0.5, 1.0, 0.85]}
                >
                  <capsuleGeometry args={[0.075, 0.38, 10, 14]} />
                </mesh>
                {/* Long Straight Back Sheet */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0, -0.18, -0.18]}
                  rotation={[0.08, 0, 0]}
                  scale={[1.4, 1.0, 0.45]}
                >
                  <capsuleGeometry args={[0.155, 0.42, 12, 16]} />
                </mesh>
              </group>
            )}

            {/* 8. TWINTAILS / MARIA-CHIQUINHA (FEMININE) — High Side Ties with Long Bouncy Twin Tails */}
            {customization.hairStyle === 'twintails' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Soft Side-Parted Bangs */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.09, 0.168, 0.165]}
                  rotation={[0.15, 0.25, 1.1]}
                >
                  <capsuleGeometry args={[0.038, 0.12, 8, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.09, 0.168, 0.165]}
                  rotation={[0.15, -0.25, -1.1]}
                >
                  <capsuleGeometry args={[0.038, 0.12, 8, 12]} />
                </mesh>
                {/* Left & Right Gold Hair Ties */}
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[-0.22, 0.12, -0.06]}
                  rotation={[0, 0.4, 0.6]}
                >
                  <torusGeometry args={[0.042, 0.014, 8, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[0.22, 0.12, -0.06]}
                  rotation={[0, -0.4, -0.6]}
                >
                  <torusGeometry args={[0.042, 0.014, 8, 16]} />
                </mesh>
                {/* Left & Right Long Cascading Twin Tails */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.29, -0.08, -0.08]}
                  rotation={[0.12, 0, 0.22]}
                >
                  <capsuleGeometry args={[0.062, 0.34, 10, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.29, -0.08, -0.08]}
                  rotation={[0.12, 0, -0.22]}
                >
                  <capsuleGeometry args={[0.062, 0.34, 10, 16]} />
                </mesh>
              </group>
            )}

            {/* 9. HIGH BUN / COQUE ALTO ELEGANTE (FEMININE) — Crown Bun + Face-Framing Tendrils */}
            {customization.hairStyle === 'high_bun' && (
              <group>
                <CraniumHairCap material={materials.hair} />
                {/* Voluminous Sculpted Top Bun */}
                <mesh castShadow material={materials.hair} position={[0, 0.28, -0.06]}>
                  <sphereGeometry args={[0.115, 18, 16]} />
                </mesh>
                {/* Gold Bun Cuff */}
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[0, 0.21, -0.05]}
                  rotation={[Math.PI / 2 - 0.15, 0, 0]}
                >
                  <torusGeometry args={[0.088, 0.014, 8, 20]} />
                </mesh>
                {/* Delicate Cheek-Framing Tendrils */}
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[-0.215, -0.02, 0.08]}
                  rotation={[0.1, 0, 0.12]}
                >
                  <capsuleGeometry args={[0.022, 0.16, 6, 10]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.hair}
                  position={[0.215, -0.02, 0.08]}
                  rotation={[0.1, 0, -0.12]}
                >
                  <capsuleGeometry args={[0.022, 0.16, 6, 10]} />
                </mesh>
              </group>
            )}

            {/* ===================================================================
                CUSTOMIZABLE ACCESSORIES (8 OPTIONS)
                =================================================================== */}
            {customization.accessory === 'glasses' && (
              <group position={[0, 0.03, 0.22]}>
                <mesh castShadow material={materials.glassesLens} position={[-0.082, 0, 0]}>
                  <boxGeometry args={[0.11, 0.065, 0.02]} />
                </mesh>
                <mesh castShadow material={materials.glassesLens} position={[0.082, 0, 0]}>
                  <boxGeometry args={[0.11, 0.065, 0.02]} />
                </mesh>
                <mesh castShadow material={materials.gold} position={[0, 0.015, 0.005]}>
                  <boxGeometry args={[0.29, 0.012, 0.022]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'headphones' && (
              <group>
                <mesh castShadow material={materials.dark} position={[0, 0.04, 0]}>
                  <torusGeometry args={[0.255, 0.022, 10, 24, Math.PI]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.dark}
                  position={[-0.25, -0.01, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[-0.276, -0.01, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                >
                  <ringGeometry args={[0.045, 0.062, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.dark}
                  position={[0.25, -0.01, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[0.276, -0.01, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <ringGeometry args={[0.045, 0.062, 16]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'crown' && (
              <group position={[0, 0.28, 0]} rotation={[0.08, 0, 0]}>
                <mesh castShadow material={materials.gold}>
                  <cylinderGeometry args={[0.11, 0.09, 0.08, 8]} />
                </mesh>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const angle = (i / 6) * Math.PI * 2;
                  return (
                    <mesh
                      key={i}
                      castShadow
                      material={materials.gold}
                      position={[Math.cos(angle) * 0.095, 0.06, Math.sin(angle) * 0.095]}
                    >
                      <coneGeometry args={[0.025, 0.06, 6]} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {customization.accessory === 'beanie' && (
              <group position={[0, 0.14, -0.03]} rotation={[-0.24, 0, 0]}>
                <mesh castShadow material={materials.primary}>
                  <sphereGeometry args={[0.244, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.secondary}
                  position={[0, 0.02, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[0.232, 0.034, 10, 24]} />
                </mesh>
                <mesh castShadow material={materials.white} position={[0, 0.25, 0]}>
                  <sphereGeometry args={[0.048, 12, 12]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'tiara' && (
              <group position={[0, 0.21, 0.06]} rotation={[-0.35, 0, 0]}>
                <mesh castShadow material={materials.gold} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.175, 0.012, 8, 24, Math.PI]} />
                </mesh>
                <mesh castShadow material={materials.crystal} position={[0, 0.045, 0.17]}>
                  <octahedronGeometry args={[0.032, 0]} />
                </mesh>
                <mesh castShadow material={materials.gold} position={[-0.055, 0.025, 0.16]}>
                  <octahedronGeometry args={[0.02, 0]} />
                </mesh>
                <mesh castShadow material={materials.gold} position={[0.055, 0.025, 0.16]}>
                  <octahedronGeometry args={[0.02, 0]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'earrings' && (
              <group>
                {/* Left & Right Gold Hoop Earrings */}
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[-0.242, -0.055, 0.01]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <torusGeometry args={[0.032, 0.006, 8, 18]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.gold}
                  position={[0.242, -0.055, 0.01]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <torusGeometry args={[0.032, 0.006, 8, 18]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'bow' && (
              <group position={[0, 0.22, -0.15]} rotation={[0.45, 0, 0]}>
                {/* Center Ribbon Knot */}
                <mesh castShadow material={materials.primary}>
                  <sphereGeometry args={[0.032, 12, 12]} />
                </mesh>
                {/* Left & Right Satin Bow Loops */}
                <mesh
                  castShadow
                  material={materials.primary}
                  position={[-0.075, 0.01, -0.01]}
                  rotation={[0, 0, 0.25]}
                  scale={[1.2, 0.75, 0.45]}
                >
                  <sphereGeometry args={[0.068, 14, 12]} />
                </mesh>
                <mesh
                  castShadow
                  material={materials.primary}
                  position={[0.075, 0.01, -0.01]}
                  rotation={[0, 0, -0.25]}
                  scale={[1.2, 0.75, 0.45]}
                >
                  <sphereGeometry args={[0.068, 14, 12]} />
                </mesh>
              </group>
            )}
          </group>

          {/* LEFT ARM */}
          <group ref={leftArmRef} position={[isFeminine ? -0.235 : -0.26, 0.42, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' || customization.outfitStyle === 'jumpsuit'
                  ? materials.skin
                  : materials.primary
              }
              position={[0, -0.11, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.05 : 0.058, 0.16, 8, 12]} />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.22, 0]}>
              <mesh
                castShadow
                material={
                  customization.outfitStyle === 'dress' ||
                  customization.outfitStyle === 'jumpsuit' ||
                  customization.outfitStyle === 'skirt_set'
                    ? materials.skin
                    : materials.primary
                }
                position={[0, -0.09, 0]}
              >
                <capsuleGeometry args={[isFeminine ? 0.044 : 0.05, 0.13, 8, 12]} />
              </mesh>
              {/* Hand */}
              <mesh castShadow material={materials.skin} position={[0, -0.21, 0]}>
                <sphereGeometry args={[isFeminine ? 0.046 : 0.052, 12, 12]} />
              </mesh>
            </group>
          </group>

          {/* RIGHT ARM */}
          <group ref={rightArmRef} position={[isFeminine ? 0.235 : 0.26, 0.42, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' || customization.outfitStyle === 'jumpsuit'
                  ? materials.skin
                  : materials.primary
              }
              position={[0, -0.11, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.05 : 0.058, 0.16, 8, 12]} />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.22, 0]}>
              <mesh
                castShadow
                material={
                  customization.outfitStyle === 'dress' ||
                  customization.outfitStyle === 'jumpsuit' ||
                  customization.outfitStyle === 'skirt_set'
                    ? materials.skin
                    : materials.primary
                }
                position={[0, -0.09, 0]}
              >
                <capsuleGeometry args={[isFeminine ? 0.044 : 0.05, 0.13, 8, 12]} />
              </mesh>
              {/* Hand */}
              <mesh castShadow material={materials.skin} position={[0, -0.21, 0]}>
                <sphereGeometry args={[isFeminine ? 0.046 : 0.052, 12, 12]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* LEFT LEG */}
        <group ref={leftLegRef} position={[-0.092, -0.04, 0]}>
          <mesh
            castShadow
            material={hasSkirt ? materials.skin : materials.secondary}
            position={[0, -0.16, 0]}
          >
            <capsuleGeometry args={[isFeminine ? 0.062 : 0.068, 0.22, 8, 12]} />
          </mesh>
          <group ref={leftShinRef} position={[0, -0.34, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' ? materials.skin : materials.secondary
              }
              position={[0, -0.14, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.052 : 0.058, 0.2, 8, 12]} />
            </mesh>
            {/* Stylish Footwear */}
            <group position={[0, -0.31, 0.035]}>
              <mesh castShadow material={materials.dark} position={[0, 0.02, 0]}>
                <boxGeometry args={[isFeminine ? 0.108 : 0.12, 0.07, 0.2]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0, -0.015, 0]}>
                <boxGeometry args={[isFeminine ? 0.115 : 0.13, 0.028, 0.215]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.03, 0.04]}>
                <boxGeometry args={[isFeminine ? 0.112 : 0.124, 0.025, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* RIGHT LEG */}
        <group ref={rightLegRef} position={[0.092, -0.04, 0]}>
          <mesh
            castShadow
            material={hasSkirt ? materials.skin : materials.secondary}
            position={[0, -0.16, 0]}
          >
            <capsuleGeometry args={[isFeminine ? 0.062 : 0.068, 0.22, 8, 12]} />
          </mesh>
          <group ref={rightShinRef} position={[0, -0.34, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' ? materials.skin : materials.secondary
              }
              position={[0, -0.14, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.052 : 0.058, 0.2, 8, 12]} />
            </mesh>
            {/* Stylish Footwear */}
            <group position={[0, -0.31, 0.035]}>
              <mesh castShadow material={materials.dark} position={[0, 0.02, 0]}>
                <boxGeometry args={[isFeminine ? 0.108 : 0.12, 0.07, 0.2]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0, -0.015, 0]}>
                <boxGeometry args={[isFeminine ? 0.115 : 0.13, 0.028, 0.215]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.03, 0.04]}>
                <boxGeometry args={[isFeminine ? 0.112 : 0.124, 0.025, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* OVERHEAD NAME TAG & SPEECH BUBBLE */}
      {showLabel && !previewMode && (
        <Html
          position={[0, 1.96, 0]}
          center
          distanceFactor={9}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-1 select-none pointer-events-none">
            {activeBubbleText && (
              <div className="max-w-[200px] px-2.5 py-1 rounded-xl bg-slate-950/75 border border-amber-400/30 text-[11px] text-slate-100 font-medium shadow-lg backdrop-blur-md">
                {activeBubbleText}
              </div>
            )}
            {!(isLocal && animation === 'sit') && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/45 border border-white/10 backdrop-blur-sm shadow-sm whitespace-nowrap opacity-75">
                {isHost && (
                  <span className="text-[9px] text-amber-400" title="Anfitrião da Sala">
                    👑
                  </span>
                )}
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: customization.primaryColor }}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    isLocal ? 'text-amber-300/90' : 'text-slate-100/90'
                  }`}
                >
                  {customization.name}
                </span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
