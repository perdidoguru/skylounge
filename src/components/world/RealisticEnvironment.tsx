import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface RealisticEnvironmentProps {
  enabled: boolean;
}

/**
 * Generates a procedural HDR-like Penthouse Studio & Twilight Skyline PMREM Cubemap
 * and binds it to `scene.environment` when `realisticShader` is enabled.
 */
export const RealisticEnvironment: React.FC<RealisticEnvironmentProps> = ({ enabled }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    if (!enabled) {
      scene.environment = null;
      return;
    }

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileCubemapShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#0c1022');

    const addLightPanel = (
      pos: [number, number, number],
      lookAt: [number, number, number],
      size: [number, number],
      hex: string,
      intensity: number
    ) => {
      const geo = new THREE.PlaneGeometry(size[0], size[1]);
      const color = new THREE.Color(hex).multiplyScalar(intensity);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.lookAt(...lookAt);
      envScene.add(mesh);
      return { geo, mat };
    };

    const disposables = [
      // Warm overhead penthouse chandelier softbox
      addLightPanel([0, 9, 2], [0, 0, 0], [10, 10], '#ffe4b5', 3.2),
      // Front-right key studio panel
      addLightPanel([6, 5, 7], [0, 1, 0], [6, 5], '#ffd29d', 2.4),
      // Cool nocturnal cyan/indigo city skyline rim light
      addLightPanel([-8, 4, -6], [0, 1, 0], [8, 6], '#38bdf8', 2.1),
      // Violet sunset horizon fill
      addLightPanel([8, 3, -7], [0, 1, 0], [8, 5], '#818cf8', 1.8),
      // Warm mahogany floor bounce
      addLightPanel([0, -7, 0], [0, 0, 0], [14, 14], '#3d2516', 1.1),
    ];

    const renderTarget = pmremGenerator.fromScene(envScene, 0.035);
    scene.environment = renderTarget.texture;

    for (const d of disposables) {
      d.geo.dispose();
      d.mat.dispose();
    }
    pmremGenerator.dispose();

    return () => {
      if (scene.environment === renderTarget.texture) {
        scene.environment = null;
      }
      renderTarget.dispose();
    };
  }, [gl, scene, enabled]);

  return null;
};
