import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GraphicsQuality } from '../../../shared/types';

interface SkyPenthouseProps {
  quality: GraphicsQuality;
}

// Reusable 3D Tropical Potted Plant Component
const PottedPlant: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => {
  const fronds = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const angle = (i / 9) * Math.PI * 2;
      const tilt = 0.35 + (i % 3) * 0.18;
      const len = 0.55 + (i % 2) * 0.18;
      return { angle, tilt, len };
    });
  }, []);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Ceramic Ribbed Planter Pot */}
      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.34, 0.24, 0.64, 20]} />
        <meshStandardMaterial color="#e7e2da" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Brass Rim */}
      <mesh position={[0, 0.63, 0]}>
        <torusGeometry args={[0.33, 0.02, 8, 24]} />
        <meshStandardMaterial color="#d49b4b" roughness={0.25} metalness={0.8} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.31, 16]} />
        <meshStandardMaterial color="#271c15" roughness={0.9} />
      </mesh>
      {/* Sculpted Stems & Tropical Leaves */}
      {fronds.map((f, idx) => (
        <group key={idx} position={[0, 0.58, 0]} rotation={[0, f.angle, 0]}>
          <group rotation={[f.tilt, 0, 0]}>
            <mesh castShadow position={[0, f.len * 0.5, 0]}>
              <cylinderGeometry args={[0.015, 0.022, f.len, 8]} />
              <meshStandardMaterial color="#2d5a3c" roughness={0.6} />
            </mesh>
            <mesh
              castShadow
              position={[0, f.len, 0.08]}
              rotation={[0.4, 0, 0]}
              scale={[1.0, 0.12, 1.85]}
            >
              <sphereGeometry args={[0.18, 12, 10]} />
              <meshStandardMaterial color={idx % 2 === 0 ? '#2f6f44' : '#3b8252'} roughness={0.45} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

// Reusable Designer Floor Lamp
const DesignerFloorLamp: React.FC<{ position: [number, number, number]; enableLight?: boolean }> = ({
  position,
  enableLight = true,
}) => (
  <group position={position}>
    {/* Marble Base */}
    <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.24, 0.26, 0.08, 20]} />
      <meshStandardMaterial color="#1c1f2b" roughness={0.3} metalness={0.4} />
    </mesh>
    {/* Brushed Brass Stem */}
    <mesh castShadow position={[0, 1.15, 0]}>
      <cylinderGeometry args={[0.022, 0.028, 2.2, 12]} />
      <meshStandardMaterial color="#d49b4b" roughness={0.25} metalness={0.85} />
    </mesh>
    {/* Warm Fabric Shade */}
    <mesh position={[0, 2.18, 0]}>
      <cylinderGeometry args={[0.22, 0.34, 0.42, 24]} />
      <meshStandardMaterial
        color="#fff3dc"
        emissive="#ffae52"
        emissiveIntensity={0.75}
        roughness={0.4}
      />
    </mesh>
    {enableLight && (
      <pointLight position={[0, 2.0, 0]} color="#ffae52" intensity={0.9} distance={9} />
    )}
  </group>
);

export const SkyPenthouse: React.FC<SkyPenthouseProps> = ({ quality }) => {
  // Procedural Warm Walnut Hardwood Floor Texture & Woven Rug Texture
  const { woodTexture, rugTexture, marbleTexture } = useMemo(() => {
    // 1. Walnut Wood Floor
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 512;
    wCanvas.height = 512;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.fillStyle = '#3b261a';
    wCtx.fillRect(0, 0, 512, 512);

    const plankRows = 16;
    const plankCols = 4;
    const rowH = 512 / plankRows;
    const colW = 512 / plankCols;

    for (let r = 0; r < plankRows; r++) {
      const offset = (r % 2) * (colW / 2);
      for (let c = -1; c <= plankCols; c++) {
        const shade = ((r * 7 + c * 13) % 5) * 4 - 8;
        wCtx.fillStyle = `rgb(${59 + shade}, ${38 + Math.floor(shade * 0.7)}, ${26 + Math.floor(shade * 0.5)})`;
        wCtx.fillRect(c * colW + offset, r * rowH, colW - 2, rowH - 2);
        wCtx.strokeStyle = '#24160e';
        wCtx.lineWidth = 2;
        wCtx.strokeRect(c * colW + offset, r * rowH, colW, rowH);
      }
    }
    const woodTex = new THREE.CanvasTexture(wCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(8, 6);
    woodTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Woven Designer Area Rug
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 512;
    rCanvas.height = 512;
    const rCtx = rCanvas.getContext('2d')!;
    rCtx.fillStyle = '#25293a';
    rCtx.fillRect(0, 0, 512, 512);
    rCtx.strokeStyle = '#d49b4b';
    rCtx.lineWidth = 10;
    rCtx.strokeRect(22, 22, 468, 468);
    rCtx.strokeStyle = '#c86d51';
    rCtx.lineWidth = 5;
    rCtx.strokeRect(42, 42, 428, 428);

    // Subtle geometric diamond pattern
    rCtx.strokeStyle = 'rgba(229, 169, 92, 0.16)';
    rCtx.lineWidth = 3;
    for (let i = -512; i < 1024; i += 48) {
      rCtx.beginPath();
      rCtx.moveTo(i, 50);
      rCtx.lineTo(i + 412, 462);
      rCtx.stroke();
      rCtx.beginPath();
      rCtx.moveTo(i + 412, 50);
      rCtx.lineTo(i, 462);
      rCtx.stroke();
    }
    const rugTex = new THREE.CanvasTexture(rCanvas);
    rugTex.colorSpace = THREE.SRGBColorSpace;

    // 3. Travertine / Dark Marble Texture
    const mCanvas = document.createElement('canvas');
    mCanvas.width = 512;
    mCanvas.height = 512;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.fillStyle = '#181c28';
    mCtx.fillRect(0, 0, 512, 512);
    mCtx.strokeStyle = 'rgba(229, 169, 92, 0.18)';
    mCtx.lineWidth = 2;
    for (let v = 0; v < 14; v++) {
      mCtx.beginPath();
      mCtx.moveTo(0, v * 38);
      mCtx.bezierCurveTo(160, v * 38 + 25, 340, v * 38 - 25, 512, v * 38 + 12);
      mCtx.stroke();
    }
    const marbleTex = new THREE.CanvasTexture(mCanvas);
    marbleTex.wrapS = THREE.RepeatWrapping;
    marbleTex.wrapT = THREE.RepeatWrapping;
    marbleTex.repeat.set(3, 3);
    marbleTex.colorSpace = THREE.SRGBColorSpace;

    return { woodTexture: woodTex, rugTexture: rugTex, marbleTexture: marbleTex };
  }, []);

  // Shared Architectural Materials
  const materials = useMemo(() => {
    const mullion = new THREE.MeshStandardMaterial({
      color: '#141824',
      roughness: 0.32,
      metalness: 0.78,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: '#d49b4b',
      roughness: 0.24,
      metalness: 0.86,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#93c5fd',
      transparent: true,
      opacity: 0.14,
      roughness: 0.08,
      metalness: 0.1,
      reflectivity: 0.85,
      depthWrite: false,
    });
    const velvetNavy = new THREE.MeshStandardMaterial({
      color: '#252c40',
      roughness: 0.72,
      metalness: 0.05,
    });
    const velvetTerracotta = new THREE.MeshStandardMaterial({
      color: '#c86d51',
      roughness: 0.68,
      metalness: 0.05,
    });
    const boucleCream = new THREE.MeshStandardMaterial({
      color: '#dfd6c7',
      roughness: 0.78,
      metalness: 0.04,
    });
    const darkWalnut = new THREE.MeshStandardMaterial({
      color: '#281a12',
      roughness: 0.45,
      metalness: 0.1,
    });
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: '#111522',
      roughness: 0.65,
      metalness: 0.15,
    });

    return {
      mullion,
      brass,
      glass,
      velvetNavy,
      velvetTerracotta,
      boucleCream,
      darkWalnut,
      ceilingMat,
    };
  }, []);

  const wallHeight = 6.5;

  return (
    <group name="sky-penthouse-interior">
      {/* ================================================================= */}
      {/* 1. MAIN FLOOR, PERIMETER SLAB & CEILING ARCHITECTURE              */}
      {/* ================================================================= */}

      {/* Main Walnut Hardwood Floor (32m x 24m) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[32, 24]} />
        <meshStandardMaterial map={woodTexture} roughness={0.36} metalness={0.08} />
      </mesh>

      {/* Exterior Structural Ledge / Terrace Rim Outside Glass */}
      <mesh receiveShadow position={[0, -0.26, 0]}>
        <boxGeometry args={[33.4, 0.5, 25.4]} />
        <meshStandardMaterial color="#0f131f" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Illuminated Exterior Perimeter Uplight Strip */}
      <mesh position={[0, 0.02, -12.3]}>
        <boxGeometry args={[32.4, 0.04, 0.08]} />
        <meshBasicMaterial color="#e5a95c" />
      </mesh>
      <mesh position={[-16.3, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.04, 24.4]} />
        <meshBasicMaterial color="#e5a95c" />
      </mesh>
      <mesh position={[16.3, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.04, 24.4]} />
        <meshBasicMaterial color="#e5a95c" />
      </mesh>

      {/* High Architectural Ceiling with Recessed Coffers (y = 6.5m) */}
      <mesh receiveShadow position={[0, wallHeight + 0.2, 0]}>
        <boxGeometry args={[32.8, 0.4, 24.8]} />
        <primitive object={materials.ceilingMat} attach="material" />
      </mesh>

      {/* Recessed Ceiling Coffer Beams & Indirect Warm LED Cove Strips */}
      {[-8, 0, 8].map((xPos, idx) => (
        <group key={`ceiling-beam-${idx}`} position={[xPos, wallHeight - 0.12, 0]}>
          <mesh material={materials.mullion}>
            <boxGeometry args={[0.55, 0.28, 23.6]} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.18, 0.03, 22.8]} />
            <meshBasicMaterial color="#ffbb6e" />
          </mesh>
        </group>
      ))}

      {[-6, 0, 6].map((zPos, idx) => (
        <group key={`ceiling-cross-${idx}`} position={[0, wallHeight - 0.12, zPos]}>
          <mesh material={materials.mullion}>
            <boxGeometry args={[31.6, 0.28, 0.55]} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[30.4, 0.03, 0.18]} />
            <meshBasicMaterial color="#ffbb6e" />
          </mesh>
        </group>
      ))}

      {/* Sculptural Central Ring Chandelier Over Cinema Lounge */}
      <group position={[0, wallHeight - 1.0, -3.2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
          <torusGeometry args={[2.1, 0.055, 12, 48]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <torusGeometry args={[2.08, 0.035, 10, 48]} />
          <meshBasicMaterial color="#ffcf87" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} material={materials.brass}>
          <torusGeometry args={[1.25, 0.04, 12, 36]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 2. FLOOR-TO-CEILING PANORAMIC GLASS WALLS & MULLIONS              */}
      {/* ================================================================= */}

      {/* NORTH PANORAMIC GLASS WALL (z = -12.0, behind the Giant TV) */}
      <mesh position={[0, wallHeight / 2, -12.0]} material={materials.glass}>
        <planeGeometry args={[32, wallHeight]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => -16 + i * 3.2).map((x, idx) => (
        <mesh
          key={`mullion-n-${idx}`}
          castShadow
          position={[x, wallHeight / 2, -12.0]}
          material={materials.mullion}
        >
          <boxGeometry args={[0.14, wallHeight, 0.22]} />
        </mesh>
      ))}
      {/* Horizontal Transom Beam */}
      <mesh position={[0, 4.6, -12.0]} material={materials.mullion}>
        <boxGeometry args={[32, 0.12, 0.2]} />
      </mesh>

      {/* WEST PANORAMIC GLASS WALL (x = -16.0) */}
      <mesh
        position={[-16.0, wallHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={materials.glass}
      >
        <planeGeometry args={[24, wallHeight]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => -12 + i * 3.0).map((z, idx) => (
        <mesh
          key={`mullion-w-${idx}`}
          castShadow
          position={[-16.0, wallHeight / 2, z]}
          material={materials.mullion}
        >
          <boxGeometry args={[0.22, wallHeight, 0.14]} />
        </mesh>
      ))}
      <mesh position={[-16.0, 4.6, 0]} material={materials.mullion}>
        <boxGeometry args={[0.2, 0.12, 24]} />
      </mesh>

      {/* EAST PANORAMIC GLASS WALL (x = +16.0) */}
      <mesh
        position={[16.0, wallHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        material={materials.glass}
      >
        <planeGeometry args={[24, wallHeight]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => -12 + i * 3.0).map((z, idx) => (
        <mesh
          key={`mullion-e-${idx}`}
          castShadow
          position={[16.0, wallHeight / 2, z]}
          material={materials.mullion}
        >
          <boxGeometry args={[0.22, wallHeight, 0.14]} />
        </mesh>
      ))}
      <mesh position={[16.0, 4.6, 0]} material={materials.mullion}>
        <boxGeometry args={[0.2, 0.12, 24]} />
      </mesh>

      {/* SOUTH PANORAMIC GLASS WALL & ARCHITECTURAL ENTRANCE FOYER (z = +12.0) */}
      <mesh
        position={[0, wallHeight / 2, 12.0]}
        rotation={[0, Math.PI, 0]}
        material={materials.glass}
      >
        <planeGeometry args={[32, wallHeight]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => -16 + i * 3.2).map((x, idx) => (
        <mesh
          key={`mullion-s-${idx}`}
          castShadow
          position={[x, wallHeight / 2, 12.0]}
          material={materials.mullion}
        >
          <boxGeometry args={[0.14, wallHeight, 0.22]} />
        </mesh>
      ))}

      {/* ================================================================= */}
      {/* 3. GRAND SOCIAL CINEMA PIT (Center-North Facing the Giant TV)     */}
      {/* ================================================================= */}

      {/* Large Woven Area Rug Under Cinema Seating */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -4.2]}>
        <planeGeometry args={[11.2, 8.4]} />
        <meshStandardMaterial map={rugTexture} roughness={0.85} />
      </mesh>

      {/* Sculptural Low Coffee Table (Center of Cinema Pit at z = -5.1) */}
      <group position={[0, 0, -5.1]}>
        {/* Walnut Table Base */}
        <mesh castShadow receiveShadow position={[0, 0.16, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[2.8, 0.32, 1.3]} />
        </mesh>
        {/* Polished Travertine Marble Top */}
        <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[3.1, 0.06, 1.5]} />
          <meshStandardMaterial map={marbleTexture} roughness={0.2} metalness={0.15} />
        </mesh>
        {/* Decorative Brass Tray & Art Books on Coffee Table */}
        <mesh castShadow position={[-0.75, 0.4, 0.1]} material={materials.brass}>
          <boxGeometry args={[0.55, 0.03, 0.38]} />
        </mesh>
        <mesh castShadow position={[0.65, 0.41, -0.15]} material={materials.velvetTerracotta}>
          <boxGeometry args={[0.38, 0.05, 0.28]} />
        </mesh>
        <mesh castShadow position={[0.68, 0.46, -0.14]} material={materials.boucleCream}>
          <boxGeometry args={[0.32, 0.04, 0.24]} />
        </mesh>
        {/* Warm Mini Table Lamp */}
        <mesh castShadow position={[-0.75, 0.52, 0.1]} material={materials.boucleCream}>
          <sphereGeometry args={[0.11, 16, 16]} />
        </mesh>
      </group>

      {/* MAIN FRONT MODULAR VELVET SOFA (Facing TV at z = -3.2) */}
      <group position={[0, 0, -3.2]}>
        {/* Walnut Base Frame */}
        <mesh castShadow receiveShadow position={[0, 0.12, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[6.6, 0.22, 1.15]} />
        </mesh>
        {/* Plush Seat Cushions */}
        <mesh castShadow receiveShadow position={[0, 0.32, -0.04]} material={materials.velvetNavy}>
          <boxGeometry args={[6.4, 0.22, 0.98]} />
        </mesh>
        {/* Sofa Backrest (On +Z side so players sit facing -Z toward the TV!) */}
        <mesh castShadow receiveShadow position={[0, 0.62, 0.44]} material={materials.velvetNavy}>
          <boxGeometry args={[6.6, 0.58, 0.26]} />
        </mesh>
        {/* Left & Right Armrests */}
        <mesh castShadow receiveShadow position={[-3.2, 0.48, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.26, 0.48, 1.15]} />
        </mesh>
        <mesh castShadow receiveShadow position={[3.2, 0.48, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.26, 0.48, 1.15]} />
        </mesh>
        {/* Decorative Throw Pillows */}
        {[-2.6, -0.9, 0.9, 2.6].map((px, i) => (
          <mesh
            key={`pillow-${i}`}
            castShadow
            position={[px, 0.54, 0.24]}
            rotation={[-0.25, (i % 2 === 0 ? 1 : -1) * 0.15, 0]}
            material={i % 2 === 0 ? materials.velvetTerracotta : materials.boucleCream}
          >
            <boxGeometry args={[0.38, 0.34, 0.14]} />
          </mesh>
        ))}
      </group>

      {/* LEFT CHAISE WING SOFA (x = -4.1, z = -5.15, facing angled toward TV) */}
      <group position={[-4.1, 0, -5.15]}>
        <mesh castShadow receiveShadow position={[0, 0.12, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[1.1, 0.22, 3.2]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.04, 0.32, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.96, 0.22, 3.05]} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.42, 0.6, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.24, 0.55, 3.2]} />
        </mesh>
      </group>

      {/* RIGHT CHAISE WING SOFA (x = +4.1, z = -5.15, facing angled toward TV) */}
      <group position={[4.1, 0, -5.15]}>
        <mesh castShadow receiveShadow position={[0, 0.12, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[1.1, 0.22, 3.2]} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.04, 0.32, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.96, 0.22, 3.05]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.42, 0.6, 0]} material={materials.velvetNavy}>
          <boxGeometry args={[0.24, 0.55, 3.2]} />
        </mesh>
      </group>

      {/* FRONT CINEMA POUFS & FLOOR CUSHIONS (Close to TV at z = -6.7..-6.9) */}
      <mesh castShadow receiveShadow position={[-2.2, 0.2, -6.7]} material={materials.velvetTerracotta}>
        <cylinderGeometry args={[0.48, 0.52, 0.38, 24]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.0, 0.15, -6.9]} material={materials.boucleCream}>
        <cylinderGeometry args={[0.56, 0.6, 0.28, 24]} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.2, 0.2, -6.7]} material={materials.velvetTerracotta}>
        <cylinderGeometry args={[0.48, 0.52, 0.38, 24]} />
      </mesh>

      {/* VIP ELEVATED BACK SOFA RISER (+0.2m Platform at z = 0.4) */}
      <group position={[0, 0, 0.4]}>
        {/* Elevated Platform Riser */}
        <mesh castShadow receiveShadow position={[0, 0.1, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[5.8, 0.2, 1.9]} />
        </mesh>
        {/* LED Riser Step Strip */}
        <mesh position={[0, 0.03, -0.96]}>
          <boxGeometry args={[5.6, 0.025, 0.03]} />
          <meshBasicMaterial color="#e5a95c" />
        </mesh>
        {/* VIP Sofa on Riser */}
        <mesh castShadow receiveShadow position={[0, 0.32, 0]} material={materials.darkWalnut}>
          <boxGeometry args={[4.8, 0.22, 1.1]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.52, -0.04]} material={materials.boucleCream}>
          <boxGeometry args={[4.6, 0.22, 0.96]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.82, 0.42]} material={materials.boucleCream}>
          <boxGeometry args={[4.8, 0.56, 0.24]} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 4. EAST MEZZANINE MIXOLOGY BAR & OBSERVATORY DECK (+1.2m Height)  */}
      {/* ================================================================= */}
      <group position={[12.0, 0, -1.5]}>
        {/* Mezzanine Raised Structural Deck (x: 8.2 to 15.8 -> width 7.6m, z: -8.5 to 5.5 -> depth 14m) */}
        <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[7.6, 1.2, 14.0]} />
          <meshStandardMaterial map={marbleTexture} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Wide Illuminated 4-Step Architectural Staircase (at z = 5.5 to 7.9) */}
        {[0, 1, 2, 3].map((step) => {
          const stepH = (4 - step) * 0.3;
          const stepZ = 7.3 + step * 0.55;
          return (
            <group key={`stair-${step}`} position={[-1.4, stepH / 2, stepZ]}>
              <mesh castShadow receiveShadow material={materials.darkWalnut}>
                <boxGeometry args={[3.8, stepH, 0.55]} />
              </mesh>
              <mesh position={[0, stepH / 2 - 0.02, 0.28]}>
                <boxGeometry args={[3.6, 0.025, 0.02]} />
                <meshBasicMaterial color="#ffbb6e" />
              </mesh>
            </group>
          );
        })}

        {/* Glass & Brushed Brass Balustrade along West Edge of Mezzanine */}
        <mesh position={[-3.72, 1.68, -0.6]} material={materials.glass}>
          <boxGeometry args={[0.06, 0.95, 12.4]} />
        </mesh>
        <mesh position={[-3.72, 2.16, -0.6]} material={materials.brass}>
          <boxGeometry args={[0.1, 0.06, 12.5]} />
        </mesh>

        {/* Sleek Marble Mixology Bar Counter */}
        <group position={[0.4, 1.2, -0.2]}>
          <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={materials.darkWalnut}>
            <boxGeometry args={[1.15, 1.1, 6.8]} />
          </mesh>
          {/* Marble Overhang Countertop */}
          <mesh castShadow receiveShadow position={[-0.08, 1.12, 0]}>
            <boxGeometry args={[1.35, 0.08, 7.0]} />
            <meshStandardMaterial color="#f1ede6" roughness={0.18} metalness={0.1} />
          </mesh>
          {/* Warm Under-Counter LED Strip */}
          <mesh position={[-0.6, 1.04, 0]}>
            <boxGeometry args={[0.03, 0.03, 6.7]} />
            <meshBasicMaterial color="#ffaa4c" />
          </mesh>
        </group>

        {/* 4 Designer Bar Stools (matching seat coordinates at x = 9.6, z = -4.2, -2.4, -0.6, 1.2) */}
        {[-2.7, -0.9, 0.9, 2.7].map((sz, idx) => (
          <group key={`bar-stool-mesh-${idx}`} position={[-2.4, 1.2, sz]}>
            {/* Brass Pedestal */}
            <mesh castShadow position={[0, 0.34, 0]} material={materials.brass}>
              <cylinderGeometry args={[0.04, 0.22, 0.68, 16]} />
            </mesh>
            {/* Velvet Cushion */}
            <mesh castShadow position={[0, 0.7, 0]} material={materials.velvetTerracotta}>
              <cylinderGeometry args={[0.26, 0.24, 0.1, 20]} />
            </mesh>
            {/* Low Curved Backrest */}
            <mesh castShadow position={[-0.18, 0.86, 0]} material={materials.velvetTerracotta}>
              <boxGeometry args={[0.08, 0.26, 0.38]} />
            </mesh>
          </group>
        ))}

        {/* Backlit Beverage & Spirit Display Shelving Unit */}
        <group position={[2.4, 1.2, -0.2]}>
          <mesh castShadow receiveShadow position={[0, 1.4, 0]} material={materials.mullion}>
            <boxGeometry args={[0.55, 2.8, 5.4]} />
          </mesh>
          {/* Warm Backlit Glow Panel */}
          <mesh position={[-0.29, 1.5, 0]}>
            <planeGeometry args={[0.02, 2.2]} />
          </mesh>
          {[0.9, 1.5, 2.1].map((shelfY, sIdx) => (
            <group key={`bar-shelf-${sIdx}`} position={[-0.15, shelfY, 0]}>
              <mesh material={materials.brass}>
                <boxGeometry args={[0.42, 0.04, 5.0]} />
              </mesh>
              {/* Decorative Colorful Glass Bottles */}
              {[-2.0, -1.4, -0.8, -0.2, 0.4, 1.0, 1.6, 2.1].map((bz, bIdx) => {
                const bottleColors = ['#f59e0b', '#10b981', '#ef4444', '#38bdf8', '#a855f7'];
                const bCol = bottleColors[(sIdx * 3 + bIdx) % bottleColors.length];
                return (
                  <mesh key={`bottle-${bIdx}`} position={[-0.05, 0.18, bz]}>
                    <cylinderGeometry args={[0.045, 0.055, 0.3, 10]} />
                    <meshStandardMaterial
                      color={bCol}
                      emissive={bCol}
                      emissiveIntensity={0.35}
                      roughness={0.15}
                      metalness={0.2}
                    />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      </group>

      {/* ================================================================= */}
      {/* 5. WEST SUNSET READING & CONVERSATION NOOK                        */}
      {/* ================================================================= */}
      <group position={[-11.8, 0, -1.5]}>
        {/* Circular Sunset Area Rug */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[3.4, 36]} />
          <meshStandardMaterial map={rugTexture} roughness={0.85} />
        </mesh>

        {/* Designer Armchairs (North & South of Nook) */}
        {[
          { pos: [1.0, 0, -2.0] as [number, number, number], rot: Math.PI * 0.35 },
          { pos: [1.0, 0, 2.0] as [number, number, number], rot: Math.PI * 0.65 },
        ].map((chair, idx) => (
          <group key={`nook-chair-${idx}`} position={chair.pos} rotation={[0, chair.rot, 0]}>
            <mesh castShadow receiveShadow position={[0, 0.22, 0]} material={materials.darkWalnut}>
              <cylinderGeometry args={[0.42, 0.36, 0.42, 20]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.45, 0]} material={materials.velvetTerracotta}>
              <cylinderGeometry args={[0.46, 0.42, 0.14, 20]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.72, -0.28]} material={materials.velvetTerracotta}>
              <boxGeometry args={[0.78, 0.48, 0.18]} />
            </mesh>
          </group>
        ))}

        {/* Mirante West Loveseat Facing Conversation Area */}
        <group position={[-1.4, 0, 0.05]}>
          <mesh castShadow receiveShadow position={[0, 0.15, 0]} material={materials.darkWalnut}>
            <boxGeometry args={[1.05, 0.28, 2.8]} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.05, 0.35, 0]} material={materials.boucleCream}>
            <boxGeometry args={[0.92, 0.2, 2.65]} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.38, 0.64, 0]} material={materials.boucleCream}>
            <boxGeometry args={[0.22, 0.52, 2.8]} />
          </mesh>
        </group>

        {/* Round Brass & Marble Side Table */}
        <group position={[0.1, 0, 0]}>
          <mesh castShadow position={[0, 0.26, 0]} material={materials.brass}>
            <cylinderGeometry args={[0.06, 0.28, 0.52, 16]} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.54, 0]}>
            <cylinderGeometry args={[0.58, 0.58, 0.05, 24]} />
            <meshStandardMaterial color="#f1ede6" roughness={0.2} />
          </mesh>
        </group>

        {/* Minimalist Open Bookshelf Divider with Books & Sculptures (at z = -5.6) */}
        <group position={[1.2, 0, -4.8]}>
          <mesh castShadow receiveShadow position={[0, 1.4, 0]} material={materials.darkWalnut}>
            <boxGeometry args={[2.4, 2.8, 0.42]} />
          </mesh>
          {[0.6, 1.2, 1.8, 2.4].map((sy, sIdx) => (
            <group key={`book-row-${sIdx}`} position={[0, sy, 0]}>
              <mesh material={materials.brass}>
                <boxGeometry args={[2.25, 0.04, 0.44]} />
              </mesh>
              {[-0.8, -0.4, 0.1, 0.55].map((bx, bIdx) => (
                <mesh
                  key={`book-${bIdx}`}
                  castShadow
                  position={[bx, 0.15, 0]}
                  material={bIdx % 2 === 0 ? materials.velvetTerracotta : materials.boucleCream}
                >
                  <boxGeometry args={[0.16, 0.26, 0.28]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </group>

      {/* ================================================================= */}
      {/* 6. 3D TROPICAL PLANTS & DESIGNER FLOOR LAMPS                      */}
      {/* ================================================================= */}
      <PottedPlant position={[-5.8, 0, -9.8]} scale={1.25} />
      <PottedPlant position={[5.8, 0, -9.8]} scale={1.25} />
      <PottedPlant position={[-14.2, 0, -9.5]} scale={1.15} />
      <PottedPlant position={[-14.2, 0, 8.8]} scale={1.15} />
      <PottedPlant position={[6.8, 0, 9.2]} scale={1.1} />

      <DesignerFloorLamp position={[-5.2, 0, -2.6]} enableLight={quality !== 'low'} />
      <DesignerFloorLamp position={[5.2, 0, -2.6]} enableLight={quality !== 'low'} />
      <DesignerFloorLamp position={[-12.8, 0, -3.6]} enableLight={quality === 'high'} />
    </group>
  );
};
