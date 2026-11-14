import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsQuality } from '../../../shared/types';

interface CitySkylineProps {
  quality: GraphicsQuality;
}

interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  baseY: number;
  hasSetback: boolean;
  setbackWidth: number;
  setbackDepth: number;
  setbackHeight: number;
  hasSpire: boolean;
  spireHeight: number;
  colorTint: string;
  neonColor: string | null;
  hasHelipad: boolean;
}

export const CitySkyline: React.FC<CitySkylineProps> = ({ quality }) => {
  const beaconsRef = useRef<THREE.InstancedMesh>(null);
  const trafficWhiteRef = useRef<THREE.InstancedMesh>(null);
  const trafficRedRef = useRef<THREE.InstancedMesh>(null);
  const airshipGroupRef = useRef<THREE.Group>(null);

  // Create procedural window facade texture with irregular warm/cool lit windows
  const facadeTextures = useMemo(() => {
    const createFacade = (warmBias: number, accentHex: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;

      // Dark architectural curtain-wall background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cols = 16;
      const rows = 48;
      const padX = 6;
      const padY = 5;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;

      // Deterministic pseudo-random helper
      let seed = Math.floor(warmBias * 9999) + 17;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let r = 0; r < rows; r++) {
        // Occasional mechanical dark floor band
        const isMechanicalFloor = r % 14 === 0;
        const floorActivity = rand();

        for (let c = 0; c < cols; c++) {
          if (isMechanicalFloor) {
            ctx.fillStyle = '#060913';
            ctx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
            continue;
          }

          const litChance = floorActivity * 0.65 + 0.12;
          if (rand() < litChance) {
            const paletteRoll = rand();
            if (paletteRoll < warmBias) {
              // Warm apartment/lounge light
              const warmColors = ['#ffd28a', '#ffb86c', '#ffe7ba', '#f6a756'];
              ctx.fillStyle = warmColors[Math.floor(rand() * warmColors.length)];
            } else if (paletteRoll < 0.88) {
              // Cool office cyan/blue light
              const coolColors = ['#8be9fd', '#7aa2f7', '#c0caf5', '#a5d8ff'];
              ctx.fillStyle = coolColors[Math.floor(rand() * coolColors.length)];
            } else {
              ctx.fillStyle = accentHex;
            }
            ctx.fillRect(c * cellW + padX, r * cellH + padY, cellW - padX * 2, cellH - padY * 2);
          } else {
            // Subtle dark reflective pane
            ctx.fillStyle = '#11182b';
            ctx.fillRect(c * cellW + padX, r * cellH + padY, cellW - padX * 2, cellH - padY * 2);
          }
        }
      }

      // Vertical mullion lines
      ctx.strokeStyle = '#050811';
      ctx.lineWidth = 3;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, canvas.height);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      return tex;
    };

    return [
      createFacade(0.65, '#ff9d42'),
      createFacade(0.35, '#a855f7'),
    ];
  }, []);

  // Custom twilight sky shader material (opaque alpha = 1.0!)
  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: true,
      uniforms: {
        uTopColor: { value: new THREE.Color('#060919') },
        uMidColor: { value: new THREE.Color('#271c47') },
        uHorizonColor: { value: new THREE.Color('#c7524a') },
        uBelowColor: { value: new THREE.Color('#050711') },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uBelowColor;

        // Simple hash for stars
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float y = dir.y;

          vec3 col;
          if (y < 0.0) {
            col = mix(uHorizonColor * 0.45, uBelowColor, clamp(-y * 3.5, 0.0, 1.0));
          } else if (y < 0.18) {
            col = mix(uHorizonColor, uMidColor, y / 0.18);
          } else {
            col = mix(uMidColor, uTopColor, clamp((y - 0.18) / 0.65, 0.0, 1.0));
          }

          // Subtle sunset glow on the West-NorthWest horizon
          float sunGlow = max(0.0, dot(dir, normalize(vec3(-0.65, 0.08, -0.75))));
          col += vec3(1.0, 0.48, 0.22) * pow(sunGlow, 7.0) * 0.48;

          // Stars in upper sky
          if (y > 0.15) {
            float starVal = hash(floor(dir * 380.0));
            if (starVal > 0.9965) {
              float brightness = (starVal - 0.9965) / 0.0035;
              col += vec3(0.95, 0.97, 1.0) * brightness * smoothstep(0.15, 0.45, y);
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  // Deterministically generate a rich 360-degree metropolitan skyline around the Penthouse
  const buildings = useMemo<BuildingData[]>(() => {
    const list: BuildingData[] = [];
    let seed = 42069;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const count = quality === 'low' ? 75 : quality === 'medium' ? 120 : 170;
    const streetY = -85;
    const neonPalette = ['#ff6b6b', '#a855f7', '#38bdf8', '#f59e0b', '#ec4899'];

    for (let i = 0; i < count; i++) {
      // Distribute in concentric rings from 36m out to 240m
      const ringProgress = i / count;
      const angle = i * 2.39996 + (rand() - 0.5) * 0.25; // Golden angle distribution for natural composition
      const radius = 36 + Math.pow(ringProgress, 0.85) * 195 + (rand() - 0.5) * 14;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Keep clear sightline corridor directly in front of the North & West glass walls
      const width = 10 + rand() * 16;
      const depth = 10 + rand() * 16;

      // Vary building heights so some hero skyscrapers rise above our penthouse level (y=0) while others stay below
      const isHeroTower = rand() > 0.72;
      const topY = isHeroTower
        ? 4 + rand() * 44
        : -35 + rand() * 38;

      const height = Math.max(25, topY - streetY);
      const hasSetback = rand() > 0.35;
      const setbackWidth = width * (0.58 + rand() * 0.2);
      const setbackDepth = depth * (0.58 + rand() * 0.2);
      const setbackHeight = 8 + rand() * 18;
      const hasSpire = isHeroTower && rand() > 0.4;
      const spireHeight = 10 + rand() * 18;

      const neonColor = rand() > 0.65 ? neonPalette[Math.floor(rand() * neonPalette.length)] : null;
      const hasHelipad = !hasSpire && isHeroTower && rand() > 0.55;

      list.push({
        x,
        z,
        width,
        depth,
        height,
        baseY: streetY + height / 2,
        hasSetback,
        setbackWidth,
        setbackDepth,
        setbackHeight,
        hasSpire,
        spireHeight,
        colorTint: rand() > 0.5 ? '#161f33' : '#1b1930',
        neonColor,
        hasHelipad,
      });
    }

    return list;
  }, [quality]);

  // Traffic vehicles moving along the avenues far below (y = -84)
  const trafficCount = quality === 'low' ? 60 : 140;
  const trafficData = useMemo(() => {
    const items: { x: number; z: number; speed: number; axis: 'x' | 'z'; dir: number }[] = [];
    const avenues = [-110, -68, -28, 28, 68, 110];
    for (let i = 0; i < trafficCount; i++) {
      const axis = i % 2 === 0 ? 'x' : 'z';
      const ave = avenues[i % avenues.length];
      const pos = (Math.random() - 0.5) * 320;
      const dir = i % 4 < 2 ? 1 : -1;
      items.push({
        x: axis === 'x' ? pos : ave + dir * 2.2,
        z: axis === 'z' ? pos : ave + dir * 2.2,
        speed: 14 + Math.random() * 18,
        axis,
        dir,
      });
    }
    return items;
  }, [trafficCount]);

  // Set static beacon positions
  useEffect(() => {
    if (!beaconsRef.current) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    buildings.forEach((b) => {
      const topY = -85 + b.height + (b.hasSetback ? b.setbackHeight : 0) + (b.hasSpire ? b.spireHeight : 0);
      dummy.position.set(b.x, topY + 0.6, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      beaconsRef.current!.setMatrixAt(idx++, dummy.matrix);
    });
    beaconsRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // Pulse red aviation obstruction beacons on skyscraper roofs
    if (beaconsRef.current) {
      const mat = beaconsRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.2);
      mat.color.setRGB(1.0 * pulse, 0.15 * pulse, 0.2 * pulse);
    }

    // Animate distant airship / cruiser moving slowly across the twilight skyline
    if (airshipGroupRef.current) {
      const orbitAngle = t * 0.045;
      airshipGroupRef.current.position.set(
        Math.cos(orbitAngle) * 115,
        24 + Math.sin(t * 0.5) * 2.5,
        Math.sin(orbitAngle) * 115
      );
      airshipGroupRef.current.rotation.y = -orbitAngle;
    }

    // Animate street traffic light trails far below
    if (trafficWhiteRef.current && trafficRedRef.current) {
      for (let i = 0; i < trafficData.length; i++) {
        const car = trafficData[i];
        if (car.axis === 'x') {
          car.x += car.speed * car.dir * dt;
          if (car.x > 170) car.x = -170;
          if (car.x < -170) car.x = 170;
          dummyObj.position.set(car.x, -84.2, car.z);
          dummyObj.scale.set(3.2, 0.4, 0.7);
        } else {
          car.z += car.speed * car.dir * dt;
          if (car.z > 170) car.z = -170;
          if (car.z < -170) car.z = 170;
          dummyObj.position.set(car.x, -84.2, car.z);
          dummyObj.scale.set(0.7, 0.4, 3.2);
        }
        dummyObj.updateMatrix();
        if (i % 2 === 0) {
          trafficWhiteRef.current.setMatrixAt(Math.floor(i / 2), dummyObj.matrix);
        } else {
          trafficRedRef.current.setMatrixAt(Math.floor(i / 2), dummyObj.matrix);
        }
      }
      trafficWhiteRef.current.instanceMatrix.needsUpdate = true;
      trafficRedRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="city-skyline">
      {/* TWILIGHT SKY DOME */}
      <mesh material={skyMaterial}>
        <sphereGeometry args={[420, 32, 24]} />
      </mesh>

      {/* OUR OWN SKYSCRAPER SHAFT BELOW THE PENTHOUSE */}
      <mesh position={[0, -45.5, 0]}>
        <boxGeometry args={[33.2, 90, 25.2]} />
        <meshStandardMaterial color="#0d1220" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* DEEP STREET PLANE & BOULEVARD GRID AT Y = -85m */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -85, 0]}>
        <planeGeometry args={[520, 520]} />
        <meshBasicMaterial color="#050710" />
      </mesh>

      {/* Glowing Avenues Below */}
      {[-110, -68, -28, 28, 68, 110].map((coord, idx) => (
        <React.Fragment key={`ave-${idx}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -84.8, coord]}>
            <planeGeometry args={[420, 7]} />
            <meshBasicMaterial color="#131b2e" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[coord, -84.75, 0]}>
            <planeGeometry args={[7, 420]} />
            <meshBasicMaterial color="#131b2e" />
          </mesh>
        </React.Fragment>
      ))}

      {/* Instanced Traffic Light Trails */}
      <instancedMesh ref={trafficWhiteRef} args={[undefined, undefined, Math.ceil(trafficCount / 2)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#fef08a" />
      </instancedMesh>
      <instancedMesh ref={trafficRedRef} args={[undefined, undefined, Math.ceil(trafficCount / 2)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f87171" />
      </instancedMesh>

      {/* Red Aviation Obstruction Beacons on All Skyscrapers */}
      <instancedMesh ref={beaconsRef} args={[undefined, undefined, buildings.length]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial color="#ff2a3a" />
      </instancedMesh>

      {/* 3D SKYSCRAPERS WITH SETBACKS, LIT WINDOWS, NEON SIGNS & HELIPADS */}
      {buildings.map((b, i) => {
        const tex = facadeTextures[i % facadeTextures.length];
        const roofY = -85 + b.height;
        const setbackTopY = roofY + (b.hasSetback ? b.setbackHeight : 0);

        return (
          <group key={i} position={[b.x, 0, b.z]}>
            {/* Main Tower Body */}
            <mesh position={[0, b.baseY, 0]}>
              <boxGeometry args={[b.width, b.height, b.depth]} />
              <meshStandardMaterial
                color={b.colorTint}
                map={tex}
                emissiveMap={tex}
                emissive="#ffffff"
                emissiveIntensity={0.85}
                roughness={0.35}
                metalness={0.4}
              />
            </mesh>

            {/* Architectural Roof Trim */}
            <mesh position={[0, roofY + 0.3, 0]}>
              <boxGeometry args={[b.width + 0.5, 0.6, b.depth + 0.5]} />
              <meshStandardMaterial color="#0b101e" roughness={0.6} />
            </mesh>

            {/* Setback Upper Tier */}
            {b.hasSetback && (
              <mesh position={[0, roofY + b.setbackHeight / 2, 0]}>
                <boxGeometry args={[b.setbackWidth, b.setbackHeight, b.setbackDepth]} />
                <meshStandardMaterial
                  color={b.colorTint}
                  map={tex}
                  emissiveMap={tex}
                  emissive="#ffffff"
                  emissiveIntensity={0.9}
                  roughness={0.3}
                  metalness={0.45}
                />
              </mesh>
            )}

            {/* Illuminated Crown / Neon Band */}
            {b.neonColor && (
              <mesh position={[0, setbackTopY - 0.8, 0]}>
                <boxGeometry
                  args={[
                    (b.hasSetback ? b.setbackWidth : b.width) + 0.3,
                    0.55,
                    (b.hasSetback ? b.setbackDepth : b.depth) + 0.3,
                  ]}
                />
                <meshBasicMaterial color={b.neonColor} />
              </mesh>
            )}

            {/* Spire / Antenna */}
            {b.hasSpire && (
              <mesh position={[0, setbackTopY + b.spireHeight / 2, 0]}>
                <cylinderGeometry args={[0.12, 0.55, b.spireHeight, 8]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
              </mesh>
            )}

            {/* Helipad Ring on Flat Hero Roofs */}
            {b.hasHelipad && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, setbackTopY + 0.12, 0]}>
                <ringGeometry args={[2.4, 2.8, 24]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* SUBTLE ANIMATED SKY CRUISER / BLIMP IN THE DISTANCE */}
      <group ref={airshipGroupRef} position={[110, 25, -80]}>
        <mesh scale={[1.0, 0.45, 2.2]}>
          <sphereGeometry args={[2.2, 16, 12]} />
          <meshStandardMaterial color="#1e293b" emissive="#38bdf8" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -1.1, 0]}>
          <boxGeometry args={[1.2, 0.5, 2.4]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>
    </group>
  );
};
