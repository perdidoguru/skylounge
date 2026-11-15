import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnimationState, AvatarCustomization, SeatPosture } from '../../../shared/types';
import { SEAT_MAP } from '../../../shared/seats';
import { localPlayerTransform } from '../../store/useGameStore';

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
  const skirtRef = useRef<THREE.Group>(null);
  const labelAnchorRef = useRef<THREE.Group>(null);

  const animClock = useRef(Math.random() * 10);
  const [activeBubbleText, setActiveBubbleText] = useState<string | null>(null);

  useEffect(() => {
    if (!lastMessage?.text) {
      setActiveBubbleText(null);
      return;
    }
    const elapsed = Date.now() - lastMessage.timestamp;
    const remaining = 6500 - elapsed;
    if (remaining <= 0) {
      setActiveBubbleText(null);
      return;
    }
    setActiveBubbleText(lastMessage.text);
    const timer = setTimeout(() => {
      setActiveBubbleText(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [lastMessage]);

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
      color: '#ff6b9d',
      transparent: true,
      opacity: isFeminine ? 0.5 : 0.38,
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

    // =========================================================================
    // EASE-IN / EASE-OUT CURVE HELPERS FOR LOOSE, FLUID CHARACTER ANIMATION
    // =========================================================================
    const easeInOutCubic = (x: number): number =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    const easeInOutQuart = (x: number): number =>
      x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;

    // Periodic wave in [-1, 1] with true Ease-In and Ease-Out at both turnarounds
    const easedOsc = (phase: number, mode: 'cubic' | 'quart' = 'cubic'): number => {
      const u = (((phase / Math.PI) % 2) + 2) % 2; // [0, 2)
      const easeFn = mode === 'quart' ? easeInOutQuart : easeInOutCubic;
      return u < 1 ? easeFn(u) * 2 - 1 : 1 - easeFn(u - 1) * 2;
    };

    // Asymmetric gravity bounce in [0, 1]: fast Ease-Out upward arc + cushioned Ease-In-Out landing
    const easedBounce = (phase: number): number => {
      const u = (((phase / (Math.PI * 2)) % 1) + 1) % 1; // [0, 1)
      if (u < 0.46) {
        const up = u / 0.46;
        return 1 - Math.pow(1 - up, 2.4); // Ease-Out up to apex
      }
      const down = (u - 0.46) / 0.54;
      return 1 - easeInOutCubic(down); // Cushioned Ease-In-Out down into knees
    };

    // Target pose variables
    // NOTE ON LIMB Z-ROTATION IN THREE.JS:
    // Because arms & legs hang down (-Y):
    // - Left limbs (at -X) flare OUTWARD away from body when rotation.z is NEGATIVE (< 0).
    // - Right limbs (at +X) flare OUTWARD away from body when rotation.z is POSITIVE (> 0).
    let hipsX = 0;
    let hipsY = 0.715;
    let hipsZ = 0;
    let hipsRotX = 0;
    let hipsRotY = 0;
    let hipsRotZ = 0;
    let spineRotX = 0;
    let spineRotY = 0;
    let spineRotZ = 0;
    let headRotY = headYaw;
    let headRotX = headPitch;
    let headRotZ = 0;

    let lArmX = 0;
    let lArmZ = isFeminine ? -0.24 : -0.27;
    let lForeX = -0.28;
    let lForeZ = -0.09;

    let rArmX = 0;
    let rArmZ = isFeminine ? 0.24 : 0.27;
    let rForeX = -0.28;
    let rForeZ = 0.09;

    let lLegX = -0.06;
    let lLegY = -0.08;
    let lLegZ = -0.065;
    let lShinX = 0.11;

    let rLegX = -0.06;
    let rLegY = 0.08;
    let rLegZ = 0.065;
    let rShinX = 0.11;

    const activeAnim: AnimationState = isLocal ? localPlayerTransform.animation : animation;
    const activeHeadYaw = isLocal ? localPlayerTransform.headYaw : headYaw;
    const activeHeadPitch = isLocal ? localPlayerTransform.headPitch : headPitch;
    headRotY = activeHeadYaw;
    headRotX = activeHeadPitch;

    // Cute eased talking bounce & head tilt when chat bubble is active
    const isTalking = Boolean(activeBubbleText);
    const talkBounce = isTalking ? easedBounce(t * 7.5) * 0.024 : 0;
    const talkHeadTilt = isTalking ? easedOsc(t * 5.2, 'cubic') * 0.075 : 0;

    switch (activeAnim) {
      case 'idle': {
        // LOOSE, RELAXED CHIBI IDLE:
        // Slow Ease-In-Out weight shift between left & right foot + overlapping follow-through
        // down the kinematic chain (Hips lead -> Spine lags -> Shoulders lag -> Forearms whip -> Head settles)
        const breath = easedBounce(t * 2.1);
        const swayHips = easedOsc(t * 1.05, 'cubic');
        const swaySpine = easedOsc(t * 1.05 - 0.48, 'cubic'); // Spine lags behind hips
        const swayHead = easedOsc(t * 1.05 - 0.92, 'cubic'); // Head lags behind spine
        const armSwing = easedOsc(t * 1.05 - 0.65, 'cubic'); // Upper arms lag as loose pendulums
        const foreSwing = easedOsc(t * 1.05 - 1.25, 'cubic'); // Forearms/hands lag behind upper arms

        hipsX = swayHips * 0.034;
        hipsY = 0.712 + breath * 0.022 - Math.abs(swayHips) * 0.008 + talkBounce;
        hipsRotZ = -swayHips * 0.042;
        hipsRotY = swayHips * (isFeminine ? 0.075 : 0.055);

        spineRotX = -0.02 + (breath - 0.5) * 0.045;
        spineRotZ = swaySpine * (isFeminine ? 0.058 : 0.045);
        spineRotY = -swaySpine * 0.04;

        // Open, relaxed arms hanging loosely away from the torso (never glued to waist!)
        const baseOutwardArm = isFeminine ? 0.25 : 0.28;
        lArmX = 0.04 + armSwing * 0.085;
        rArmX = 0.04 - armSwing * 0.085;
        lArmZ = -(baseOutwardArm + breath * 0.045 + Math.max(0, -swaySpine) * 0.04);
        rArmZ = baseOutwardArm + breath * 0.045 + Math.max(0, swaySpine) * 0.04;

        // Loose elbows & wrists with secondary follow-through
        lForeX = -0.28 + foreSwing * 0.07 - breath * 0.04;
        rForeX = -0.28 - foreSwing * 0.07 - breath * 0.04;
        lForeZ = -0.09 - Math.max(0, -foreSwing) * 0.05;
        rForeZ = 0.09 + Math.max(0, foreSwing) * 0.05;

        // Relaxed A-stance legs with alternating soft knee bend as weight shifts left/right
        const leftWeight = Math.max(0, -swayHips); // 0..1 when leaning right, left knee bends loosely
        const rightWeight = Math.max(0, swayHips);
        lLegX = -0.06 - leftWeight * 0.07;
        rLegX = -0.06 - rightWeight * 0.07;
        lLegZ = -0.068 - swayHips * 0.025;
        rLegZ = 0.068 - swayHips * 0.025;
        lLegY = -0.09;
        rLegY = 0.09;
        lShinX = 0.11 + leftWeight * 0.14;
        rShinX = 0.11 + rightWeight * 0.14;

        headRotY = activeHeadYaw + easedOsc(t * 0.68, 'quart') * 0.075;
        headRotX = activeHeadPitch + (breath - 0.5) * 0.045;
        headRotZ = swayHead * 0.072 + talkHeadTilt;
        break;
      }

      case 'walk': {
        // LOOSE, BOUNCY CHIBI WALK WITH EASE-IN / EASE-OUT & FOLLOW-THROUGH
        const w = t * 7.8;
        const stride = easedOsc(w, 'cubic');
        const strideDelayed = easedOsc(w - 0.58, 'cubic'); // Forearms & head lag behind stride
        const stepBounce = easedBounce(w * 2); // Smooth ease-out up, ease-in-out cushioned landing

        hipsX = stride * 0.038;
        hipsY = 0.705 + stepBounce * 0.064 + talkBounce;
        hipsRotY = stride * (isFeminine ? 0.16 : 0.12);
        hipsRotZ = -stride * 0.05;

        spineRotX = 0.045 + (1 - stepBounce) * 0.035;
        spineRotZ = strideDelayed * 0.075;
        spineRotY = -stride * 0.09;

        // Legs swing with eased turnarounds and cushioned knee bend on pass-through
        lLegX = stride * 0.56;
        rLegX = -stride * 0.56;
        lLegZ = -0.065;
        rLegZ = 0.065;
        lLegY = -0.06;
        rLegY = 0.06;
        lShinX = 0.08 + Math.max(0, -Math.cos(w - 0.25)) * 0.64;
        rShinX = 0.08 + Math.max(0, Math.cos(w - 0.25)) * 0.64;

        // Wide, loose pendulum arm swing (flared outward so hands never touch hips)
        lArmX = -stride * 0.48;
        rArmX = stride * 0.48;
        lArmZ = -0.28 - stepBounce * 0.06;
        rArmZ = 0.28 + stepBounce * 0.06;

        // Phase-delayed forearm whip for loose follow-through
        lForeX = -0.36 - Math.max(0, -strideDelayed) * 0.32;
        rForeX = -0.36 - Math.max(0, strideDelayed) * 0.32;
        lForeZ = -0.1;
        rForeZ = 0.1;

        headRotZ = -strideDelayed * 0.085 + talkHeadTilt;
        headRotX = activeHeadPitch + (stepBounce - 0.5) * 0.055;
        headRotY = activeHeadYaw + strideDelayed * 0.05;
        break;
      }

      case 'run': {
        // ENERGETIC, LOOSE CHIBI DASH WITH EASE-OUT AERIAL FLOAT & FOREARM WHIP
        const r = t * 12.2;
        const stride = easedOsc(r, 'cubic');
        const strideDelayed = easedOsc(r - 0.52, 'cubic');
        const dashBounce = easedBounce(r * 2);

        hipsX = stride * 0.042;
        hipsY = 0.695 + dashBounce * 0.095 + talkBounce;
        hipsRotY = stride * 0.18;
        hipsRotZ = -stride * 0.06;

        spineRotX = 0.15 + (1 - dashBounce) * 0.05;
        spineRotZ = strideDelayed * 0.095;
        spineRotY = -stride * 0.12;

        lLegX = stride * 0.92;
        rLegX = -stride * 0.92;
        lLegZ = -0.075;
        rLegZ = 0.075;
        lShinX = 0.14 + Math.max(0, -Math.cos(r - 0.2)) * 0.96;
        rShinX = 0.14 + Math.max(0, Math.cos(r - 0.2)) * 0.96;

        lArmX = -stride * 0.86;
        rArmX = stride * 0.86;
        lArmZ = -0.34 - dashBounce * 0.06;
        rArmZ = 0.34 + dashBounce * 0.06;
        lForeX = -0.88 - Math.max(0, -strideDelayed) * 0.28;
        rForeX = -0.88 - Math.max(0, strideDelayed) * 0.28;
        lForeZ = -0.12;
        rForeZ = 0.12;

        headRotX = activeHeadPitch - 0.08 + (dashBounce - 0.5) * 0.07;
        headRotZ = -strideDelayed * 0.095;
        break;
      }

      case 'jump': {
        // OPEN, JOYFUL STAR-HOP (Arms flared WIDE outward, legs loosely tucked)
        hipsY = 0.85;
        spineRotX = -0.12;
        lLegX = -0.45;
        lShinX = 0.78;
        lLegZ = -0.14;
        rLegX = 0.22;
        rShinX = 0.55;
        rLegZ = 0.14;
        lArmX = -0.95;
        rArmX = -0.95;
        lArmZ = -0.58; // Wide outward left arm!
        rArmZ = 0.58; // Wide outward right arm!
        lForeX = -0.38;
        rForeX = -0.38;
        headRotX = activeHeadPitch - 0.14;
        break;
      }

      case 'sit': {
        // LOOSE, COZY SEATED ANIMATIONS WITH EASE-IN / EASE-OUT SWAY & DELAYED FOLLOW-THROUGH
        const breath = easedBounce(t * 1.9);
        const kickL = easedOsc(t * 2.1, 'cubic');
        const kickR = easedOsc(t * 2.1 - 2.4, 'cubic'); // Offset phase so feet don't move like a stiff metronome
        const swaySpine = easedOsc(t * 1.15, 'cubic');
        const swayHead = easedOsc(t * 1.15 - 0.55, 'cubic'); // Head lags behind spine sway
        const posture: SeatPosture = (seatId && SEAT_MAP[seatId]?.posture) || 'sofa';

        if (posture === 'sofa') {
          // 1. SOFA: Open, relaxed cinema lounge, elbows resting wide, loose alternating foot swings
          hipsY = 0.11 + talkBounce * 0.65;
          hipsZ = -0.05;
          spineRotX = -0.11 + (breath - 0.5) * 0.03;
          spineRotZ = swaySpine * 0.042;
          lLegX = -1.42;
          lShinX = 1.3 + kickL * 0.12;
          rLegX = -1.42;
          rShinX = 1.3 + kickR * 0.12;
          lLegZ = isFeminine ? -0.05 : -0.12;
          rLegZ = isFeminine ? 0.05 : 0.12;

          lArmX = -0.32;
          lArmZ = -0.26; // Open outward elbow
          lForeX = -0.48 + kickL * 0.04;
          lForeZ = 0.12;

          rArmX = -0.32;
          rArmZ = 0.26; // Open outward elbow
          rForeX = -0.48 + kickR * 0.04;
          rForeZ = -0.12;

          headRotY = activeHeadYaw + easedOsc(t * 0.65, 'quart') * 0.06;
          headRotX = activeHeadPitch + (breath - 0.5) * 0.035;
          headRotZ = swayHead * 0.068 + talkHeadTilt;
        } else if (posture === 'chaise') {
          // 2. CHAISE LONGUE: Deep sunbed recline with open arms and eased ankle rock
          hipsY = 0.11 + talkBounce * 0.65;
          hipsZ = -0.09;
          spineRotX = -0.22 + (breath - 0.5) * 0.028;
          spineRotZ = swaySpine * 0.035;
          lLegX = -1.26;
          lShinX = 0.35 + kickL * 0.075;
          lLegZ = -0.09;
          rLegX = -1.32;
          rShinX = 0.42 + kickR * 0.075;
          rLegZ = 0.12;

          lArmX = -0.18;
          lArmZ = -0.36;
          lForeX = -0.42;
          rArmX = -0.28;
          rArmZ = 0.32;
          rForeX = -0.48;
          headRotZ = 0.04 + swayHead * 0.055 + talkHeadTilt;
          headRotY = activeHeadYaw + easedOsc(t * 0.55, 'quart') * 0.055;
        } else if (posture === 'pouf') {
          // 3. VELVET POUF: Loose, excited cinema watch pose on pouf with bouncy feet & open elbows
          hipsY = 0.11 + breath * 0.014 + talkBounce * 0.75;
          hipsZ = 0.0;
          spineRotX = 0.06 + (breath - 0.5) * 0.035;
          spineRotZ = swaySpine * 0.052;
          lLegX = -1.38;
          lShinX = 1.34 + kickL * 0.14;
          rLegX = -1.38;
          rShinX = 1.34 + kickR * 0.14;
          lLegZ = -0.11;
          rLegZ = 0.11;

          lArmX = -0.36;
          rArmX = -0.36;
          lArmZ = -0.24; // Flared outward elbows
          rArmZ = 0.24;
          lForeX = -0.46 + (breath - 0.5) * 0.05;
          rForeX = -0.46 + (breath - 0.5) * 0.05;
          lForeZ = 0.14;
          rForeZ = -0.14;
          headRotX = activeHeadPitch - 0.04 + (breath - 0.5) * 0.045;
          headRotZ = swayHead * 0.075 + talkHeadTilt;
        } else if (posture === 'cushion') {
          // 4. FLOOR CUSHION: Loose cross-legged lotus sit with fluid figure-8 torso & head sway
          hipsY = 0.09 + talkBounce * 0.65;
          hipsZ = -0.02;
          spineRotX = -0.02 + (breath - 0.5) * 0.035;
          spineRotZ = swaySpine * 0.06;

          lLegX = -1.32;
          lLegZ = -0.48;
          lLegY = 0.28;
          lShinX = 1.52;

          rLegX = -1.32;
          rLegZ = 0.48;
          rLegY = -0.28;
          rShinX = 1.52;

          lArmX = -0.26;
          rArmX = -0.26;
          lArmZ = -0.28;
          rArmZ = 0.28;
          lForeX = -0.46;
          rForeX = -0.46;
          lForeZ = 0.12;
          rForeZ = -0.12;
          headRotY = activeHeadYaw + easedOsc(t * 0.75, 'quart') * 0.06;
          headRotZ = swayHead * 0.08 + talkHeadTilt;
        } else if (posture === 'vip') {
          // 5. VIP PANORAMIC SOFA: Wide arms draped along the backrest & loose swinging crossed leg
          hipsY = 0.11 + talkBounce * 0.65;
          hipsZ = -0.06;
          spineRotX = -0.16 + (breath - 0.5) * 0.028;
          spineRotZ = swaySpine * 0.038;

          lLegX = -1.42;
          lShinX = 1.36;
          lLegZ = -0.08;
          rLegX = -1.58;
          rLegZ = -0.16;
          rLegY = -0.2;
          rShinX = 1.24 + kickL * 0.12;

          lArmX = -0.14;
          lArmZ = -0.52; // Wide open left arm on backrest
          lForeX = -0.32;
          rArmX = -0.14;
          rArmZ = 0.52; // Wide open right arm on backrest
          rForeX = -0.32;
          headRotY = activeHeadYaw + easedOsc(t * 0.6, 'quart') * 0.06;
          headRotZ = swayHead * 0.058 + talkHeadTilt;
        } else if (posture === 'armchair') {
          // 6. SUNSET READING ARMCHAIR: Relaxed open-armrest pose with eased foot & hand bounce
          hipsY = 0.11 + talkBounce * 0.65;
          hipsZ = -0.05;
          spineRotX = -0.08 + (breath - 0.5) * 0.028;
          spineRotZ = 0.035 + swaySpine * 0.035;

          lLegX = -1.44;
          lLegZ = -0.06;
          lShinX = 1.36;
          rLegX = -1.56;
          rLegZ = -0.12;
          rShinX = 1.22 + kickL * 0.11;

          lArmX = -0.34;
          lArmZ = -0.26;
          lForeX = -0.52;
          lForeZ = 0.12;

          rArmX = -0.42;
          rArmZ = 0.24;
          rForeX = -0.64 + kickR * 0.075;
          rForeZ = -0.1;
          headRotZ = -0.04 + swayHead * 0.06 + talkHeadTilt;
          headRotY = activeHeadYaw + easedOsc(t * 0.75, 'quart') * 0.065;
        } else if (posture === 'barstool') {
          // 7. SKYBAR HIGH STOOL: Loose dangling legs with eased pendulum swing
          hipsY = 0.12 + talkBounce * 0.65;
          hipsZ = 0.01;
          spineRotX = 0.04 + (breath - 0.5) * 0.03;
          spineRotZ = swaySpine * 0.048;

          lLegX = -1.16;
          lLegZ = -0.1;
          lShinX = 1.3 + kickR * 0.1;
          rLegX = -0.78;
          rLegZ = 0.1;
          rShinX = 0.54 + kickL * 0.16;

          lArmX = -0.42;
          lArmZ = -0.26;
          lForeX = -0.56;
          rArmX = -0.42;
          rArmZ = 0.26;
          rForeX = -0.6 + kickL * 0.07;
          headRotY = activeHeadYaw + easedOsc(t * 0.85, 'quart') * 0.065;
          headRotZ = swayHead * 0.062 + talkHeadTilt;
        }
        break;
      }

      case 'wave': {
        // LOOSE, EXPRESSIVE CHIBI WAVE WITH EASE-IN-OUT ARC & WHIPPY FOREARM FOLLOW-THROUGH
        const wave = easedOsc(t * 8.5, 'cubic');
        const waveFore = easedOsc(t * 8.5 - 0.65, 'cubic'); // Wrist/forearm lags behind upper arm
        const bounce = easedBounce(t * 4.25);

        hipsX = easedOsc(t * 2.1, 'cubic') * 0.035;
        hipsY = 0.715 + bounce * 0.038;
        spineRotZ = -0.09 + wave * 0.045;

        rArmX = -2.35;
        rArmZ = 0.42 + wave * 0.34; // Flared wide outward to the right
        rForeX = -0.38;
        rForeZ = 0.15 + waveFore * 0.32;

        lArmX = 0.08;
        lArmZ = -0.28; // Left arm relaxed outward
        lForeX = -0.32;

        headRotZ = -0.12 - waveFore * 0.065;
        headRotY = easedOsc(t * 2.1, 'cubic') * 0.09;
        break;
      }

      case 'dance': {
        // FLUID, LOOSE GROOVE DANCE WITH EASE-IN / EASE-OUT BOUNCE & OVERLAPPING JOINTS
        const beat = t * 6.8;
        const groove = easedOsc(beat, 'cubic');
        const grooveDelayed = easedOsc(beat - 0.55, 'cubic');
        const grooveHalf = easedOsc(beat * 0.5, 'cubic');
        const bounce = easedBounce(beat * 2);

        hipsX = groove * 0.065;
        hipsY = 0.675 + bounce * 0.088;
        hipsRotY = groove * 0.32;
        hipsRotZ = -groove * 0.075;

        spineRotZ = grooveDelayed * 0.16;
        spineRotX = (bounce - 0.5) * 0.11;
        spineRotY = -groove * 0.14;

        lLegX = groove * 0.4;
        rLegX = -groove * 0.4;
        lLegZ = -0.1 - Math.max(0, -groove) * 0.12;
        rLegZ = 0.1 + Math.max(0, groove) * 0.12;
        lShinX = 0.12 + Math.max(0, Math.cos(beat - 0.3)) * 0.52;
        rShinX = 0.12 + Math.max(0, -Math.cos(beat - 0.3)) * 0.52;

        lArmX = -1.35 + groove * 0.68;
        rArmX = -1.35 - groove * 0.68;
        lArmZ = -0.48 - (grooveHalf + 1) * 0.18; // Flared outward left
        rArmZ = 0.48 + (1 - grooveHalf) * 0.18; // Flared outward right
        lForeX = -0.62 + grooveDelayed * 0.32;
        rForeX = -0.62 - grooveDelayed * 0.32;

        headRotY = grooveHalf * 0.24;
        headRotZ = -grooveDelayed * 0.13;
        headRotX = (bounce - 0.5) * 0.09;
        break;
      }

      case 'cheer': {
        // JOYFUL EASE-OUT JUMP-CHEER WITH WIDE OPEN ARMS & FOLLOW-THROUGH
        const pump = t * 8.2;
        const bounce = easedBounce(pump);
        const sway = easedOsc(pump * 0.5, 'cubic');
        const armWave = easedOsc(pump - 0.4, 'cubic');

        hipsX = sway * 0.035;
        hipsY = 0.72 + bounce * 0.085;
        spineRotX = -0.12 - bounce * 0.05;
        spineRotZ = sway * 0.07;

        lArmX = -2.55 + armWave * 0.34;
        rArmX = -2.55 - armWave * 0.34;
        lArmZ = -0.45 - bounce * 0.15; // Wide open V-shape!
        rArmZ = 0.45 + bounce * 0.15;
        lForeX = -0.28;
        rForeX = -0.28;

        lLegZ = -0.09 - bounce * 0.05;
        rLegZ = 0.09 + bounce * 0.05;
        lShinX = 0.1 + (1 - bounce) * 0.18;
        rShinX = 0.1 + (1 - bounce) * 0.18;

        headRotX = -0.16 + (bounce - 0.5) * 0.1;
        headRotZ = sway * 0.09;
        break;
      }

      case 'laugh': {
        // LOOSE CHIBI GIGGLE WITH BOUNCY SHOULDERS & EASE-IN-OUT SWAY
        const chuckle = t * 12.5;
        const bounce = easedBounce(chuckle);
        const sway = easedOsc(t * 2.8, 'cubic');

        hipsX = sway * 0.028;
        hipsY = 0.705 + bounce * 0.032;
        spineRotX = 0.11 + (bounce - 0.5) * 0.07;
        spineRotZ = sway * 0.065;

        lArmX = -0.78;
        rArmX = -0.78;
        lArmZ = -0.26; // Elbows comfortably open
        rArmZ = 0.26;
        lForeX = -1.12 + (bounce - 0.5) * 0.14;
        rForeX = -1.12 + (bounce - 0.5) * 0.14;
        lForeZ = 0.28;
        rForeZ = -0.28;

        headRotX = -0.09 + (bounce - 0.5) * 0.09;
        headRotZ = sway * 0.085;
        break;
      }
    }

    // Staggered Ease-Out Damping Speeds down the kinematic chain for natural follow-through:
    // Hips lead -> Spine follows -> Upper limbs follow -> Forearms/Shins & Head settle softly last
    const hipsDamp = 9.5;
    const spineDamp = 7.8;
    const limbDamp = 9.0;
    const secondaryDamp = 6.2;
    const headDamp = 6.5;

    hips.position.x = THREE.MathUtils.damp(hips.position.x, hipsX, hipsDamp, dt);
    hips.position.y = THREE.MathUtils.damp(hips.position.y, hipsY, hipsDamp, dt);
    hips.position.z = THREE.MathUtils.damp(hips.position.z, hipsZ, hipsDamp, dt);
    hips.rotation.x = THREE.MathUtils.damp(hips.rotation.x, hipsRotX, hipsDamp, dt);
    hips.rotation.y = THREE.MathUtils.damp(hips.rotation.y, hipsRotY, hipsDamp, dt);
    hips.rotation.z = THREE.MathUtils.damp(hips.rotation.z, hipsRotZ, hipsDamp, dt);

    spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, spineRotX, spineDamp, dt);
    spine.rotation.y = THREE.MathUtils.damp(spine.rotation.y, spineRotY, spineDamp, dt);
    spine.rotation.z = THREE.MathUtils.damp(spine.rotation.z, spineRotZ, spineDamp, dt);

    head.rotation.y = THREE.MathUtils.damp(head.rotation.y, headRotY, headDamp, dt);
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, headRotX, headDamp, dt);
    head.rotation.z = THREE.MathUtils.damp(head.rotation.z, headRotZ, headDamp, dt);

    lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, lArmX, limbDamp, dt);
    lArm.rotation.z = THREE.MathUtils.damp(lArm.rotation.z, lArmZ, limbDamp, dt);
    lFore.rotation.x = THREE.MathUtils.damp(lFore.rotation.x, lForeX, secondaryDamp, dt);
    lFore.rotation.z = THREE.MathUtils.damp(lFore.rotation.z, lForeZ, secondaryDamp, dt);

    rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, rArmX, limbDamp, dt);
    rArm.rotation.z = THREE.MathUtils.damp(rArm.rotation.z, rArmZ, limbDamp, dt);
    rFore.rotation.x = THREE.MathUtils.damp(rFore.rotation.x, rForeX, secondaryDamp, dt);
    rFore.rotation.z = THREE.MathUtils.damp(rFore.rotation.z, rForeZ, secondaryDamp, dt);

    lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, lLegX, limbDamp, dt);
    lLeg.rotation.y = THREE.MathUtils.damp(lLeg.rotation.y, lLegY, limbDamp, dt);
    lLeg.rotation.z = THREE.MathUtils.damp(lLeg.rotation.z, lLegZ, limbDamp, dt);
    lShin.rotation.x = THREE.MathUtils.damp(lShin.rotation.x, lShinX, secondaryDamp, dt);

    rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, rLegX, limbDamp, dt);
    rLeg.rotation.y = THREE.MathUtils.damp(rLeg.rotation.y, rLegY, limbDamp, dt);
    rLeg.rotation.z = THREE.MathUtils.damp(rLeg.rotation.z, rLegZ, limbDamp, dt);
    rShin.rotation.x = THREE.MathUtils.damp(rShin.rotation.x, rShinX, secondaryDamp, dt);

    // Smoothly drape skirt over thighs when seated so it never sticks vertically into cushions
    if (skirtRef.current) {
      const targetSkirtY = activeAnim === 'sit' ? -0.01 : -0.08;
      const targetSkirtZ = activeAnim === 'sit' ? 0.095 : 0;
      const targetSkirtRotX = activeAnim === 'sit' ? -0.82 : 0;
      const targetSkirtScaleY = activeAnim === 'sit' ? 0.68 : 1.0;
      skirtRef.current.position.y = THREE.MathUtils.damp(skirtRef.current.position.y, targetSkirtY, spineDamp, dt);
      skirtRef.current.position.z = THREE.MathUtils.damp(skirtRef.current.position.z, targetSkirtZ, spineDamp, dt);
      skirtRef.current.rotation.x = THREE.MathUtils.damp(skirtRef.current.rotation.x, targetSkirtRotX, spineDamp, dt);
      skirtRef.current.scale.y = THREE.MathUtils.damp(skirtRef.current.scale.y, targetSkirtScaleY, spineDamp, dt);
    }

    // Keep overhead label & bubble anchored cleanly above the head whether standing or seated
    if (labelAnchorRef.current) {
      labelAnchorRef.current.position.y = hips.position.y + 1.18;
    }

    // Periodic natural eye blink
    const blinkCycle = t % 4.2;
    const blinkScaleY = blinkCycle > 4.04 ? 0.12 : 1.0;
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = THREE.MathUtils.damp(leftEyeRef.current.scale.y, blinkScaleY, 28, dt);
      rightEyeRef.current.scale.y = THREE.MathUtils.damp(rightEyeRef.current.scale.y, blinkScaleY, 28, dt);
    }
  });

  const hasSkirt =
    customization.outfitStyle === 'dress' || customization.outfitStyle === 'skirt_set';

  return (
    <group ref={rootRef}>
      {/* Subtle ground contact shadow disc (hidden when seated on furniture) */}
      {animation !== 'sit' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.36, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      )}

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
          <group ref={skirtRef} position={[0, -0.08, 0]}>
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

          {/* HEAD & EXPRESSIVE CUTE CHIBI FACE */}
          <group ref={headGroupRef} position={[0, 0.74, 0]} scale={[1.15, 1.12, 1.13]}>
            {/* Sculpted Chibi Head Sphere with Soft Cheeks */}
            <mesh castShadow receiveShadow material={materials.skin} scale={[1.05, 0.96, 0.98]}>
              <sphereGeometry args={[0.235, 28, 24]} />
            </mesh>

            {/* Cute Rounded Ears */}
            <mesh
              castShadow
              material={materials.skin}
              position={[-0.235, -0.015, 0]}
              scale={[0.52, 0.78, 0.62]}
            >
              <sphereGeometry args={[0.064, 12, 12]} />
            </mesh>
            <mesh
              castShadow
              material={materials.skin}
              position={[0.235, -0.015, 0]}
              scale={[0.52, 0.78, 0.62]}
            >
              <sphereGeometry args={[0.064, 12, 12]} />
            </mesh>

            {/* Cute Tiny Button Nose */}
            <mesh castShadow material={materials.skin} position={[0, -0.018, 0.234]}>
              <sphereGeometry args={[isFeminine ? 0.02 : 0.023, 12, 12]} />
            </mesh>

            {/* Warm Oval Kawaii Cheek Blush + Cute Highlight Dots */}
            <mesh
              material={materials.blush}
              position={[-0.122, -0.044, 0.205]}
              rotation={[0, -0.38, 0]}
              scale={[1.32, 0.85, 1]}
            >
              <circleGeometry args={[isFeminine ? 0.044 : 0.038, 16]} />
            </mesh>
            <mesh
              material={materials.white}
              position={[-0.132, -0.038, 0.208]}
              rotation={[0, -0.38, 0]}
            >
              <circleGeometry args={[0.006, 8]} />
            </mesh>

            <mesh
              material={materials.blush}
              position={[0.122, -0.044, 0.205]}
              rotation={[0, 0.38, 0]}
              scale={[1.32, 0.85, 1]}
            >
              <circleGeometry args={[isFeminine ? 0.044 : 0.038, 16]} />
            </mesh>
            <mesh
              material={materials.white}
              position={[0.132, -0.038, 0.208]}
              rotation={[0, 0.38, 0]}
            >
              <circleGeometry args={[0.006, 8]} />
            </mesh>

            {/* Left Big Sparkling Kawaii Eye */}
            <group ref={leftEyeRef} position={[-0.084, 0.018, 0.212]} rotation={[0, -0.2, 0]}>
              <mesh material={materials.white} scale={[0.92, 1.14, 0.4]}>
                <sphereGeometry args={[0.044, 18, 18]} />
              </mesh>
              <mesh material={materials.dark} position={[0, -0.002, 0.012]} scale={[0.9, 1.1, 0.36]}>
                <sphereGeometry args={[0.031, 16, 16]} />
              </mesh>
              {/* Dual Star Catchlight Sparkles */}
              <mesh material={materials.white} position={[0.01, 0.013, 0.025]}>
                <sphereGeometry args={[0.01, 10, 10]} />
              </mesh>
              <mesh material={materials.white} position={[-0.01, -0.011, 0.024]}>
                <sphereGeometry args={[0.0055, 8, 8]} />
              </mesh>
              {/* Feminine Winged Eyelashes */}
              {isFeminine && (
                <group>
                  <mesh
                    material={materials.dark}
                    position={[-0.006, 0.039, 0.013]}
                    rotation={[0, 0, 0.22]}
                  >
                    <capsuleGeometry args={[0.006, 0.046, 4, 8]} />
                  </mesh>
                  <mesh
                    material={materials.dark}
                    position={[-0.036, 0.032, 0.01]}
                    rotation={[0, 0, 0.65]}
                  >
                    <coneGeometry args={[0.008, 0.026, 6]} />
                  </mesh>
                </group>
              )}
            </group>

            {/* Right Big Sparkling Kawaii Eye */}
            <group ref={rightEyeRef} position={[0.084, 0.018, 0.212]} rotation={[0, 0.2, 0]}>
              <mesh material={materials.white} scale={[0.92, 1.14, 0.4]}>
                <sphereGeometry args={[0.044, 18, 18]} />
              </mesh>
              <mesh material={materials.dark} position={[0, -0.002, 0.012]} scale={[0.9, 1.1, 0.36]}>
                <sphereGeometry args={[0.031, 16, 16]} />
              </mesh>
              {/* Dual Star Catchlight Sparkles */}
              <mesh material={materials.white} position={[0.01, 0.013, 0.025]}>
                <sphereGeometry args={[0.01, 10, 10]} />
              </mesh>
              <mesh material={materials.white} position={[-0.01, -0.011, 0.024]}>
                <sphereGeometry args={[0.0055, 8, 8]} />
              </mesh>
              {/* Feminine Winged Eyelashes */}
              {isFeminine && (
                <group>
                  <mesh
                    material={materials.dark}
                    position={[0.006, 0.039, 0.013]}
                    rotation={[0, 0, -0.22]}
                  >
                    <capsuleGeometry args={[0.006, 0.046, 4, 8]} />
                  </mesh>
                  <mesh
                    material={materials.dark}
                    position={[0.036, 0.032, 0.01]}
                    rotation={[0, 0, -0.65]}
                  >
                    <coneGeometry args={[0.008, 0.026, 6]} />
                  </mesh>
                </group>
              )}
            </group>

            {/* Eyebrows (Horizontal soft arcs cleanly visible below the hairline!) */}
            <mesh
              material={materials.hair}
              position={[-0.085, 0.088, 0.21]}
              rotation={[0, -0.2, Math.PI / 2 + (isFeminine ? 0.12 : 0.08)]}
            >
              <capsuleGeometry args={[isFeminine ? 0.0065 : 0.008, 0.038, 4, 8]} />
            </mesh>
            <mesh
              material={materials.hair}
              position={[0.085, 0.088, 0.21]}
              rotation={[0, 0.2, Math.PI / 2 - (isFeminine ? 0.12 : 0.08)]}
            >
              <capsuleGeometry args={[isFeminine ? 0.0065 : 0.008, 0.038, 4, 8]} />
            </mesh>

            {/* Cute Happy Cat-Arch Smile */}
            <mesh
              material={materials.lipTint}
              position={[0, -0.068, 0.218]}
              rotation={[Math.PI * 0.95, 0, 0]}
            >
              <torusGeometry args={[0.028, isFeminine ? 0.008 : 0.0068, 8, 16, Math.PI]} />
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
          <group ref={leftArmRef} position={[isFeminine ? -0.252 : -0.278, 0.42, 0]}>
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
              {/* Cute Plump Chibi Hand & Thumb */}
              <group position={[0, -0.21, 0]}>
                <mesh castShadow material={materials.skin}>
                  <sphereGeometry args={[isFeminine ? 0.054 : 0.058, 14, 14]} />
                </mesh>
                <mesh castShadow material={materials.skin} position={[0.034, 0.01, 0.022]}>
                  <sphereGeometry args={[0.022, 10, 10]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* RIGHT ARM */}
          <group ref={rightArmRef} position={[isFeminine ? 0.252 : 0.278, 0.42, 0]}>
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
              {/* Cute Plump Chibi Hand & Thumb */}
              <group position={[0, -0.21, 0]}>
                <mesh castShadow material={materials.skin}>
                  <sphereGeometry args={[isFeminine ? 0.054 : 0.058, 14, 14]} />
                </mesh>
                <mesh castShadow material={materials.skin} position={[-0.034, 0.01, 0.022]}>
                  <sphereGeometry args={[0.022, 10, 10]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* LEFT LEG */}
        <group ref={leftLegRef} position={[-0.114, -0.04, 0]}>
          <mesh
            castShadow
            material={hasSkirt ? materials.skin : materials.secondary}
            position={[0, -0.16, 0]}
          >
            <capsuleGeometry args={[isFeminine ? 0.064 : 0.07, 0.22, 8, 12]} />
          </mesh>
          <group ref={leftShinRef} position={[0, -0.34, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' ? materials.skin : materials.secondary
              }
              position={[0, -0.14, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.054 : 0.06, 0.2, 8, 12]} />
            </mesh>
            {/* Cute Rounded Capsule Sneakers */}
            <group position={[0, -0.31, 0.035]}>
              <mesh
                castShadow
                material={materials.dark}
                position={[0, 0.022, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[1.05, 1.0, 0.72]}
              >
                <capsuleGeometry args={[0.058, 0.09, 8, 14]} />
              </mesh>
              <mesh
                castShadow
                material={materials.white}
                position={[0, -0.012, 0.005]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[1.14, 1.04, 0.36]}
              >
                <capsuleGeometry args={[0.06, 0.095, 8, 14]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.035, 0.035]} scale={[1.1, 0.5, 0.8]}>
                <sphereGeometry args={[0.048, 10, 10]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* RIGHT LEG */}
        <group ref={rightLegRef} position={[0.114, -0.04, 0]}>
          <mesh
            castShadow
            material={hasSkirt ? materials.skin : materials.secondary}
            position={[0, -0.16, 0]}
          >
            <capsuleGeometry args={[isFeminine ? 0.064 : 0.07, 0.22, 8, 12]} />
          </mesh>
          <group ref={rightShinRef} position={[0, -0.34, 0]}>
            <mesh
              castShadow
              material={
                customization.outfitStyle === 'dress' ? materials.skin : materials.secondary
              }
              position={[0, -0.14, 0]}
            >
              <capsuleGeometry args={[isFeminine ? 0.054 : 0.06, 0.2, 8, 12]} />
            </mesh>
            {/* Cute Rounded Capsule Sneakers */}
            <group position={[0, -0.31, 0.035]}>
              <mesh
                castShadow
                material={materials.dark}
                position={[0, 0.022, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[1.05, 1.0, 0.72]}
              >
                <capsuleGeometry args={[0.058, 0.09, 8, 14]} />
              </mesh>
              <mesh
                castShadow
                material={materials.white}
                position={[0, -0.012, 0.005]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[1.14, 1.04, 0.36]}
              >
                <capsuleGeometry args={[0.06, 0.095, 8, 14]} />
              </mesh>
              <mesh castShadow material={materials.primary} position={[0, 0.035, 0.035]} scale={[1.1, 0.5, 0.8]}>
                <sphereGeometry args={[0.048, 10, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* OVERHEAD NAME TAG & COMPACT SPEECH BUBBLE */}
      {showLabel && !previewMode && (
        <group ref={labelAnchorRef} position={[0, 1.88, 0]}>
          <Html
            position={[0, 0, 0]}
            center
            distanceFactor={9}
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center gap-0.5 select-none pointer-events-none w-max">
              {activeBubbleText && (
                <div
                  style={{ width: 'max-content', maxWidth: '235px' }}
                  className="relative w-max max-w-[235px] px-2.5 py-1 rounded-lg bg-slate-950/82 border border-amber-400/35 text-[10px] leading-tight text-slate-100 font-medium shadow-md backdrop-blur-md text-center whitespace-normal break-words"
                >
                  {activeBubbleText}
                  <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-slate-950/82 border-r border-b border-amber-400/35" />
                </div>
              )}
              {!(isLocal && animation === 'sit') && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/45 border border-white/10 backdrop-blur-sm shadow-sm whitespace-nowrap opacity-70">
                  {isHost && (
                    <span className="text-[8px] text-amber-400" title="Anfitrião da Sala">
                      👑
                    </span>
                  )}
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: customization.primaryColor }}
                  />
                  <span
                    className={`text-[9px] font-medium tracking-wide ${
                      isLocal ? 'text-amber-300/90' : 'text-slate-100/90'
                    }`}
                  >
                    {customization.name}
                  </span>
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};
