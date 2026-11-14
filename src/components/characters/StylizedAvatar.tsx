import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnimationState, AvatarCustomization } from '../../../shared/types';

interface StylizedAvatarProps {
  customization: AvatarCustomization;
  animation: AnimationState;
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

export const StylizedAvatar: React.FC<StylizedAvatarProps> = ({
  customization,
  animation,
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

  // Memoized materials for performance & consistent visual style
  const materials = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({
      color: customization.skinColor,
      roughness: 0.55,
      metalness: 0.05,
    });
    const primary = new THREE.MeshStandardMaterial({
      color: customization.primaryColor,
      roughness: 0.45,
      metalness: 0.12,
    });
    const secondary = new THREE.MeshStandardMaterial({
      color: customization.secondaryColor,
      roughness: 0.6,
      metalness: 0.08,
    });
    const hair = new THREE.MeshStandardMaterial({
      color: customization.hairColor,
      roughness: 0.42,
      metalness: 0.1,
    });
    const white = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
      metalness: 0.05,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: '#111622',
      roughness: 0.3,
      metalness: 0.25,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: '#f5b851',
      roughness: 0.22,
      metalness: 0.85,
      emissive: '#593a08',
      emissiveIntensity: 0.25,
    });
    const blush = new THREE.MeshBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: 0.32,
    });
    const glassesLens = new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.1,
      metalness: 0.85,
    });

    return { skin, primary, secondary, hair, white, dark, gold, blush, glassesLens };
  }, [
    customization.skinColor,
    customization.primaryColor,
    customization.secondaryColor,
    customization.hairColor,
  ]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    animClock.current += dt;
    const t = animClock.current;

    if (previewMode && rootRef.current) {
      rootRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.35;
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

    if (!hips || !spine || !head || !lArm || !lFore || !rArm || !rFore || !lLeg || !lShin || !rLeg || !rShin) {
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
    let lArmZ = 0.12;
    let lForeX = -0.15;

    let rArmX = 0;
    let rArmZ = -0.12;
    let rForeX = -0.15;

    let lLegX = 0;
    let lShinX = 0;
    let rLegX = 0;
    let rShinX = 0;

    const dampSpeed = 12;

    switch (animation) {
      case 'idle': {
        const breath = Math.sin(t * 2.1);
        hipsY = 0.72 + breath * 0.012;
        spineRotX = breath * 0.025;
        spineRotZ = Math.cos(t * 1.1) * 0.018;
        lArmX = Math.sin(t * 1.5) * 0.04;
        rArmX = -Math.sin(t * 1.5) * 0.04;
        lArmZ = 0.12 + breath * 0.015;
        rArmZ = -0.12 - breath * 0.015;
        headRotY = headYaw + Math.sin(t * 0.8) * 0.05;
        headRotX = headPitch + Math.cos(t * 1.3) * 0.03;
        break;
      }

      case 'walk': {
        const w = t * 8.5;
        hipsY = 0.72 + Math.abs(Math.cos(w)) * 0.045;
        hipsRotY = Math.sin(w) * 0.08;
        spineRotX = 0.06;
        spineRotZ = Math.cos(w) * 0.03;

        lLegX = Math.sin(w) * 0.58;
        rLegX = -Math.sin(w) * 0.58;
        lShinX = Math.max(0, -Math.cos(w) * 0.55);
        rShinX = Math.max(0, Math.cos(w) * 0.55);

        lArmX = -Math.sin(w) * 0.45;
        rArmX = Math.sin(w) * 0.45;
        lForeX = -0.28 - Math.max(0, -Math.sin(w)) * 0.25;
        rForeX = -0.28 - Math.max(0, Math.sin(w)) * 0.25;
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
        hipsY = 0.44;
        hipsZ = -0.06;
        spineRotX = -0.08 + breath * 0.015;
        lLegX = -1.48;
        lShinX = 1.42;
        rLegX = -1.48;
        rShinX = 1.42;

        lArmX = -0.32;
        rArmX = -0.32;
        lArmZ = 0.16;
        rArmZ = -0.16;
        lForeX = -0.55;
        rForeX = -0.55;
        headRotY = headYaw + Math.sin(t * 0.6) * 0.04;
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

    rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, rArmX, dampSpeed, dt);
    rArm.rotation.z = THREE.MathUtils.damp(rArm.rotation.z, rArmZ, dampSpeed, dt);
    rFore.rotation.x = THREE.MathUtils.damp(rFore.rotation.x, rForeX, dampSpeed, dt);

    lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, lLegX, dampSpeed, dt);
    lShin.rotation.x = THREE.MathUtils.damp(lShin.rotation.x, lShinX, dampSpeed, dt);
    rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, rLegX, dampSpeed, dt);
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

  return (
    <group ref={rootRef}>
      {/* Subtle ground contact shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.36, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* HIPS ROOT */}
      <group ref={hipsRef} position={[0, 0.72, 0]}>
        {/* Pelvis / Belt Block */}
        <mesh castShadow receiveShadow material={materials.secondary} position={[0, 0, 0]}>
          <capsuleGeometry args={[0.17, 0.1, 8, 16]} />
        </mesh>

        {/* Belt & Gold Buckle */}
        <mesh castShadow material={materials.dark} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.182, 0.182, 0.045, 20]} />
        </mesh>
        <mesh castShadow material={materials.gold} position={[0, 0.03, 0.18]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
        </mesh>

        {/* SPINE & UPPER BODY */}
        <group ref={spineRef} position={[0, 0.06, 0]}>
          {/* Main Torso Sculpt */}
          <mesh castShadow receiveShadow material={materials.primary} position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.21, 0.175, 0.44, 20]} />
          </mesh>
          {/* Rounded Shoulder Bridge */}
          <mesh
            castShadow
            receiveShadow
            material={materials.primary}
            position={[0, 0.43, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <capsuleGeometry args={[0.11, 0.24, 8, 16]} />
          </mesh>

          {/* OUTFIT DETAILS BY STYLE */}
          {customization.outfitStyle === 'jacket' && (
            <group>
              {/* Inner Shirt */}
              <mesh castShadow material={materials.white} position={[0, 0.27, 0.165]}>
                <boxGeometry args={[0.12, 0.36, 0.08]} />
              </mesh>
              {/* Popped Bomber Collar */}
              <mesh castShadow material={materials.secondary} position={[0, 0.48, -0.01]}>
                <torusGeometry args={[0.135, 0.035, 10, 20, Math.PI * 1.35]} />
              </mesh>
              {/* Gold Zipper Trim */}
              <mesh castShadow material={materials.gold} position={[0.065, 0.25, 0.2]}>
                <boxGeometry args={[0.014, 0.38, 0.02]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'hoodie' && (
            <group>
              {/* Cozy Hood Resting Behind Neck */}
              <mesh castShadow material={materials.primary} position={[0, 0.48, -0.14]} rotation={[0.4, 0, 0]}>
                <sphereGeometry args={[0.16, 16, 12]} />
              </mesh>
              {/* Front Kangaroo Pocket */}
              <mesh castShadow material={materials.secondary} position={[0, 0.14, 0.18]}>
                <boxGeometry args={[0.22, 0.13, 0.06]} />
              </mesh>
              {/* Drawstrings */}
              <mesh castShadow material={materials.white} position={[-0.05, 0.36, 0.2]}>
                <capsuleGeometry args={[0.01, 0.12, 4, 8]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0.05, 0.36, 0.2]}>
                <capsuleGeometry args={[0.01, 0.12, 4, 8]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'blazer' && (
            <group>
              {/* Crisp Dress Shirt V */}
              <mesh castShadow material={materials.white} position={[0, 0.32, 0.168]}>
                <boxGeometry args={[0.14, 0.28, 0.07]} />
              </mesh>
              {/* Tailored Lapels */}
              <mesh
                castShadow
                material={materials.secondary}
                position={[-0.075, 0.33, 0.195]}
                rotation={[0, 0, -0.22]}
              >
                <boxGeometry args={[0.05, 0.26, 0.03]} />
              </mesh>
              <mesh
                castShadow
                material={materials.secondary}
                position={[0.075, 0.33, 0.195]}
                rotation={[0, 0, 0.22]}
              >
                <boxGeometry args={[0.05, 0.26, 0.03]} />
              </mesh>
              {/* Gold Pocket Square */}
              <mesh castShadow material={materials.gold} position={[0.11, 0.35, 0.195]}>
                <boxGeometry args={[0.055, 0.03, 0.025]} />
              </mesh>
            </group>
          )}

          {customization.outfitStyle === 'vest' && (
            <group>
              {/* Quilted Puffer Ribs */}
              <mesh castShadow material={materials.secondary} position={[0, 0.36, 0]}>
                <cylinderGeometry args={[0.225, 0.22, 0.11, 20]} />
              </mesh>
              <mesh castShadow material={materials.secondary} position={[0, 0.23, 0]}>
                <cylinderGeometry args={[0.22, 0.205, 0.11, 20]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.205, 0.185, 0.1, 20]} />
              </mesh>
            </group>
          )}

          {/* NECK */}
          <mesh castShadow material={materials.skin} position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          </mesh>

          {/* HEAD & EXPRESSIVE FACE */}
          <group ref={headGroupRef} position={[0, 0.74, 0]}>
            {/* Sculpted Head Sphere */}
            <mesh castShadow receiveShadow material={materials.skin} scale={[1.0, 0.96, 0.96]}>
              <sphereGeometry args={[0.235, 28, 24]} />
            </mesh>

            {/* Ears */}
            <mesh castShadow material={materials.skin} position={[-0.23, -0.01, 0]} scale={[0.45, 0.8, 0.6]}>
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>
            <mesh castShadow material={materials.skin} position={[0.23, -0.01, 0]} scale={[0.45, 0.8, 0.6]}>
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>

            {/* Cute Button Nose */}
            <mesh castShadow material={materials.skin} position={[0, -0.015, 0.23]}>
              <sphereGeometry args={[0.026, 12, 12]} />
            </mesh>

            {/* Cheek Blush */}
            <mesh material={materials.blush} position={[-0.11, -0.045, 0.202]} rotation={[0, -0.35, 0]}>
              <circleGeometry args={[0.036, 16]} />
            </mesh>
            <mesh material={materials.blush} position={[0.11, -0.045, 0.202]} rotation={[0, 0.35, 0]}>
              <circleGeometry args={[0.036, 16]} />
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
            </group>

            {/* Eyebrows */}
            <mesh
              material={materials.hair}
              position={[-0.085, 0.082, 0.208]}
              rotation={[0, -0.2, 0.1]}
            >
              <capsuleGeometry args={[0.009, 0.042, 4, 8]} />
            </mesh>
            <mesh
              material={materials.hair}
              position={[0.085, 0.082, 0.208]}
              rotation={[0, 0.2, -0.1]}
            >
              <capsuleGeometry args={[0.009, 0.042, 4, 8]} />
            </mesh>

            {/* Expressive Smile / Mouth */}
            <mesh
              material={materials.dark}
              position={[0, -0.072, 0.214]}
              rotation={[Math.PI * 0.95, 0, 0]}
            >
              <torusGeometry args={[0.028, 0.006, 8, 16, Math.PI]} />
            </mesh>

            {/* 3D SCULPTED HAIRSTYLES */}
            {customization.hairStyle === 'spiky' && (
              <group>
                {/* Hair Cap */}
                <mesh castShadow material={materials.hair} position={[0, 0.06, -0.02]} scale={[1.05, 0.95, 1.06]}>
                  <sphereGeometry args={[0.23, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                </mesh>
                {/* Textured Stylized Spikes / Swoops */}
                <mesh castShadow material={materials.hair} position={[0, 0.22, 0.09]} rotation={[0.45, 0, 0]}>
                  <coneGeometry args={[0.09, 0.22, 10]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[-0.1, 0.2, 0.07]} rotation={[0.35, 0, 0.38]}>
                  <coneGeometry args={[0.08, 0.2, 10]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[0.1, 0.2, 0.07]} rotation={[0.35, 0, -0.38]}>
                  <coneGeometry args={[0.08, 0.2, 10]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[0, 0.23, -0.05]} rotation={[-0.25, 0, 0]}>
                  <coneGeometry args={[0.1, 0.2, 10]} />
                </mesh>
              </group>
            )}

            {customization.hairStyle === 'bob' && (
              <group>
                {/* Top Crown */}
                <mesh castShadow material={materials.hair} position={[0, 0.04, -0.01]} scale={[1.08, 0.98, 1.08]}>
                  <sphereGeometry args={[0.235, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
                </mesh>
                {/* Side Bob Wings */}
                <mesh castShadow material={materials.hair} position={[-0.21, -0.02, 0.02]} rotation={[0, 0, 0.12]}>
                  <capsuleGeometry args={[0.065, 0.18, 8, 12]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[0.21, -0.02, 0.02]} rotation={[0, 0, -0.12]}>
                  <capsuleGeometry args={[0.065, 0.18, 8, 12]} />
                </mesh>
                {/* Front Side-Swept Fringe */}
                <mesh castShadow material={materials.hair} position={[0.04, 0.13, 0.19]} rotation={[0.2, 0, -0.45]}>
                  <capsuleGeometry args={[0.048, 0.16, 8, 12]} />
                </mesh>
              </group>
            )}

            {customization.hairStyle === 'curly' && (
              <group>
                {[
                  [0, 0.21, 0.04, 0.11],
                  [-0.13, 0.18, 0.05, 0.1],
                  [0.13, 0.18, 0.05, 0.1],
                  [-0.19, 0.09, -0.02, 0.095],
                  [0.19, 0.09, -0.02, 0.095],
                  [0, 0.19, -0.11, 0.115],
                  [-0.12, 0.12, -0.14, 0.1],
                  [0.12, 0.12, -0.14, 0.1],
                  [0, 0.06, -0.19, 0.1],
                  [-0.06, 0.16, 0.15, 0.075],
                  [0.07, 0.16, 0.15, 0.075],
                ].map(([x, y, z, r], idx) => (
                  <mesh key={idx} castShadow material={materials.hair} position={[x, y, z]}>
                    <sphereGeometry args={[r, 14, 14]} />
                  </mesh>
                ))}
              </group>
            )}

            {customization.hairStyle === 'ponytail' && (
              <group>
                <mesh castShadow material={materials.hair} position={[0, 0.05, -0.01]} scale={[1.05, 0.96, 1.06]}>
                  <sphereGeometry args={[0.232, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
                </mesh>
                {/* Gold Hair Tie */}
                <mesh castShadow material={materials.gold} position={[0, 0.12, -0.23]} rotation={[0.5, 0, 0]}>
                  <torusGeometry args={[0.048, 0.016, 8, 16]} />
                </mesh>
                {/* Flowing Ponytail Volume */}
                <mesh castShadow material={materials.hair} position={[0, 0.03, -0.32]} rotation={[0.75, 0, 0]}>
                  <capsuleGeometry args={[0.075, 0.22, 8, 16]} />
                </mesh>
              </group>
            )}

            {customization.hairStyle === 'waves' && (
              <group>
                <mesh castShadow material={materials.hair} position={[0, 0.06, -0.01]} scale={[1.07, 0.97, 1.07]}>
                  <sphereGeometry args={[0.234, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                </mesh>
                {/* Swept Wave Crest */}
                <mesh castShadow material={materials.hair} position={[-0.05, 0.2, 0.12]} rotation={[0.2, 0.3, -0.6]}>
                  <capsuleGeometry args={[0.065, 0.18, 8, 14]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[-0.19, -0.04, -0.06]} rotation={[0.15, 0, 0.15]}>
                  <capsuleGeometry args={[0.06, 0.22, 8, 12]} />
                </mesh>
                <mesh castShadow material={materials.hair} position={[0.19, -0.04, -0.06]} rotation={[0.15, 0, -0.15]}>
                  <capsuleGeometry args={[0.06, 0.22, 8, 12]} />
                </mesh>
              </group>
            )}

            {/* CUSTOMIZABLE ACCESSORIES */}
            {customization.accessory === 'glasses' && (
              <group position={[0, 0.03, 0.22]}>
                {/* Left & Right Designer Lenses */}
                <mesh castShadow material={materials.glassesLens} position={[-0.082, 0, 0]}>
                  <boxGeometry args={[0.11, 0.065, 0.02]} />
                </mesh>
                <mesh castShadow material={materials.glassesLens} position={[0.082, 0, 0]}>
                  <boxGeometry args={[0.11, 0.065, 0.02]} />
                </mesh>
                {/* Gold Frame & Bridge */}
                <mesh castShadow material={materials.gold} position={[0, 0.015, 0.005]}>
                  <boxGeometry args={[0.29, 0.012, 0.022]} />
                </mesh>
              </group>
            )}

            {customization.accessory === 'headphones' && (
              <group>
                {/* Headband Arch */}
                <mesh castShadow material={materials.dark} position={[0, 0.04, 0]}>
                  <torusGeometry args={[0.255, 0.022, 10, 24, Math.PI]} />
                </mesh>
                {/* Earcups */}
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
              <group position={[0, 0.14, -0.02]} rotation={[-0.18, 0, 0]}>
                <mesh castShadow material={materials.primary}>
                  <sphereGeometry args={[0.242, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                </mesh>
                <mesh castShadow material={materials.secondary} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.228, 0.035, 10, 24]} />
                </mesh>
                <mesh castShadow material={materials.white} position={[0, 0.25, 0]}>
                  <sphereGeometry args={[0.048, 12, 12]} />
                </mesh>
              </group>
            )}
          </group>

          {/* LEFT ARM */}
          <group ref={leftArmRef} position={[-0.26, 0.42, 0]}>
            <mesh castShadow material={materials.primary} position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.058, 0.16, 8, 12]} />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.22, 0]}>
              <mesh castShadow material={materials.primary} position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.05, 0.13, 8, 12]} />
              </mesh>
              {/* Hand */}
              <mesh castShadow material={materials.skin} position={[0, -0.21, 0]}>
                <sphereGeometry args={[0.052, 12, 12]} />
              </mesh>
            </group>
          </group>

          {/* RIGHT ARM */}
          <group ref={rightArmRef} position={[0.26, 0.42, 0]}>
            <mesh castShadow material={materials.primary} position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.058, 0.16, 8, 12]} />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.22, 0]}>
              <mesh castShadow material={materials.primary} position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.05, 0.13, 8, 12]} />
              </mesh>
              {/* Hand */}
              <mesh castShadow material={materials.skin} position={[0, -0.21, 0]}>
                <sphereGeometry args={[0.052, 12, 12]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* LEFT LEG */}
        <group ref={leftLegRef} position={[-0.095, -0.04, 0]}>
          <mesh castShadow material={materials.secondary} position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.068, 0.22, 8, 12]} />
          </mesh>
          <group ref={leftShinRef} position={[0, -0.34, 0]}>
            <mesh castShadow material={materials.secondary} position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.058, 0.2, 8, 12]} />
            </mesh>
            {/* Stylish Sneaker */}
            <group position={[0, -0.31, 0.035]}>
              <mesh castShadow material={materials.dark} position={[0, 0.02, 0]}>
                <boxGeometry args={[0.12, 0.07, 0.21]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0, -0.015, 0]}>
                <boxGeometry args={[0.13, 0.028, 0.225]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.03, 0.04]}>
                <boxGeometry args={[0.124, 0.025, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* RIGHT LEG */}
        <group ref={rightLegRef} position={[0.095, -0.04, 0]}>
          <mesh castShadow material={materials.secondary} position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.068, 0.22, 8, 12]} />
          </mesh>
          <group ref={rightShinRef} position={[0, -0.34, 0]}>
            <mesh castShadow material={materials.secondary} position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.058, 0.2, 8, 12]} />
            </mesh>
            {/* Stylish Sneaker */}
            <group position={[0, -0.31, 0.035]}>
              <mesh castShadow material={materials.dark} position={[0, 0.02, 0]}>
                <boxGeometry args={[0.12, 0.07, 0.21]} />
              </mesh>
              <mesh castShadow material={materials.white} position={[0, -0.015, 0]}>
                <boxGeometry args={[0.13, 0.028, 0.225]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.03, 0.04]}>
                <boxGeometry args={[0.124, 0.025, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* OVERHEAD NAME TAG & SPEECH BUBBLE */}
      {showLabel && !previewMode && (
        <Html
          position={[0, 1.98, 0]}
          center
          distanceFactor={9}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center gap-1.5 select-none pointer-events-none">
            {activeBubbleText && (
              <div className="max-w-[220px] px-3 py-1.5 rounded-2xl bg-slate-900/92 border border-amber-400/40 text-xs text-slate-100 font-medium shadow-xl backdrop-blur-md animate-bounce">
                {activeBubbleText}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/75 border border-white/15 backdrop-blur-sm shadow-lg whitespace-nowrap">
              {isHost && (
                <span className="text-[11px] text-amber-400" title="Anfitrião da Sala">
                  👑
                </span>
              )}
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: customization.primaryColor }}
              />
              <span className={`text-[11px] font-semibold tracking-wide ${isLocal ? 'text-amber-300' : 'text-white'}`}>
                {customization.name}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
