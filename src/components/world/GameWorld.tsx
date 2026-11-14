import React from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { CitySkyline } from './CitySkyline';
import { SkyPenthouse } from './SkyPenthouse';
import { CinemaTV } from './CinemaTV';
import { SeatingSystem } from './SeatingSystem';
import { PlayerController } from '../controllers/PlayerController';
import { RemotePlayers } from './RemotePlayers';
import { CommentNPCs } from './CommentNPCs';

export const GameWorld: React.FC = () => {
  const quality = useGameStore((s) => s.settings.graphicsQuality);

  const dpr: [number, number] =
    quality === 'low' ? [0.85, 1] : quality === 'medium' ? [1, 1.5] : [1, 2];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070913]">
      {/* LAYER 1 (z-index: 1): CSS3DRenderer Stage Layer for the 3D-Transformed Embedded TV Player */}
      <div
        id="css3d-stage-layer"
        className="absolute inset-0 z-[1] overflow-hidden"
      />

      {/* LAYER 2 (z-index: 2): WebGL 3D World Canvas with Hardware Depth-Buffer Hole-Punch */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        <Canvas
          shadows={quality !== 'low'}
          dpr={dpr}
          camera={{ fov: 55, near: 0.15, far: 520, position: [0, 3.2, 11.5] }}
          gl={{
            alpha: true,
            antialias: quality !== 'low',
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            // Clear canvas with opaque alpha=1.0 every frame; ONLY the TV screen hole-punch mesh writes alpha=0.0!
            gl.setClearColor(new THREE.Color('#070913'), 1.0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          }}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Atmospheric Twilight Fog */}
          <fog attach="fog" args={['#0d1024', 55, 340]} />

          {/* Warm Interior & Twilight Exterior Lighting */}
          <ambientLight intensity={0.62} color="#d8dff8" />
          <hemisphereLight
            color="#ffcf96"
            groundColor="#1a1d36"
            intensity={0.68}
          />

          {/* Primary Warm Penthouse Architectural Directional Light */}
          <directionalLight
            castShadow={quality !== 'low'}
            position={[8, 16, 10]}
            intensity={1.35}
            color="#ffdcb0"
            shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
            shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
            shadow-camera-near={1}
            shadow-camera-far={45}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
            shadow-bias={-0.0005}
          />

          {/* Warm Interior Lounge Point Lights */}
          <pointLight position={[0, 5.2, -3.5]} intensity={1.4} distance={22} color="#ffbe73" />
          <pointLight position={[-10.5, 4.8, -1.5]} intensity={1.0} distance={18} color="#ffa952" />
          <pointLight position={[11.8, 5.2, -1.5]} intensity={1.2} distance={18} color="#ffc278" />
          <pointLight position={[0, 4.8, 7.0]} intensity={0.9} distance={16} color="#9bb8ff" />

          {/* 3D External Skyline */}
          <CitySkyline quality={quality} />

          {/* 3D Sky Penthouse Architecture & Decor */}
          <SkyPenthouse quality={quality} />

          {/* 3D Giant Social Cinema Television */}
          <CinemaTV />

          {/* Interactive Sofas, Poufs, Armchairs & Bar Stools */}
          <SeatingSystem />

          {/* Local Third-Person Player & Roblox-Style Camera Controller */}
          <PlayerController />

          {/* Interpolated Remote Multiplayer Participants */}
          <RemotePlayers />

          {/* 0 to 6 Spectator NPCs that react with random words from active stream comments */}
          <CommentNPCs />
        </Canvas>
      </div>
    </div>
  );
};
