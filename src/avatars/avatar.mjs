/** SkyLounge, Three r169. Call once per SkeletonUtils.clone(scene). */

function getMaterialShaderType(matName) {
  if (matName === 'Mat_Skin') return 1; // Subsurface Scattering (SSS) + Dermal Wrap + Dual Specular
  if (matName === 'Mat_Primary' || matName === 'Mat_Secondary') return 2; // Velvet / Woven Cloth Sheen
  if (matName === 'Mat_Hair') return 3; // Kajiya-Kay Dual Anisotropic Hair Highlights
  if (matName === 'Mat_AccentGold' || matName === 'Mat_Dark' || matName === 'Mat_White') return 4; // Clearcoat / Gloss
  return 0;
}

function attachRealisticShader(material) {
  const matType = getMaterialShaderType(material.name || '');
  if (matType === 0) return;

  const baseRoughness = material.roughness ?? 0.5;
  const baseMetalness = material.metalness ?? 0.0;

  material.userData.uRealisticShader = { value: 1.0 };
  material.userData.uMatType = { value: matType };
  material.userData.baseRoughness = baseRoughness;
  material.userData.baseMetalness = baseMetalness;

  material.customProgramCacheKey = () => `skylounge_realistic_v2_${matType}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRealisticShader = material.userData.uRealisticShader;
    shader.uniforms.uMatType = material.userData.uMatType;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uRealisticShader;
      uniform int uMatType;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `if (uRealisticShader > 0.5) {
        vec3 V = normalize(vViewPosition);
        vec3 N = normalize(normal);
        float NdotV = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = pow(1.0 - NdotV, 3.2);

        float lumaBase = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.001);
        float lumaLit = dot(totalDiffuse, vec3(0.299, 0.587, 0.114));
        float lightRatio = clamp(lumaLit / lumaBase, 0.0, 1.5);

        if (uMatType == 1) {
          // 1. REALISTIC SKIN SHADER (Subsurface Scattering + Dermal Penumbra Wrap + Dual-Lobe Specular)
          float penumbra = smoothstep(0.02, 0.45, lightRatio) * (1.0 - smoothstep(0.45, 0.98, lightRatio));
          vec3 sssTint = vec3(0.96, 0.32, 0.22) * diffuseColor.rgb;
          vec3 sssWrap = sssTint * (penumbra * 0.44 + (1.0 - clamp(lightRatio, 0.0, 1.0)) * 0.11);

          vec3 keyDir = normalize(vec3(0.35, 0.75, 0.55));
          vec3 H = normalize(V + keyDir);
          float NdotH = clamp(dot(N, H), 0.0, 1.0);
          float skinSpec = pow(NdotH, 32.0) * 0.12 + pow(NdotH, 7.0) * 0.045;
          vec3 peachFuzzRim = mix(diffuseColor.rgb, vec3(1.0, 0.84, 0.74), 0.5) * pow(1.0 - NdotV, 3.5) * 0.22;

          outgoingLight += sssWrap + vec3(1.0, 0.96, 0.92) * skinSpec * clamp(lightRatio, 0.2, 1.0) + peachFuzzRim;
        } else if (uMatType == 2) {
          // 2. REALISTIC FABRIC / VELVET SHEEN SHADER
          vec3 sheenColor = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.93), 0.36);
          float clothSheen = pow(1.0 - NdotV, 2.8) * 0.28;
          float creaseAO = mix(0.88, 1.04, smoothstep(0.0, 0.72, NdotV));
          outgoingLight = outgoingLight * creaseAO + sheenColor * clothSheen * clamp(lightRatio + 0.25, 0.0, 1.2);
        } else if (uMatType == 3) {
          // 3. REALISTIC ANISOTROPIC KAJIYA-KAY HAIR SHADER
          vec3 T = normalize(cross(N, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
          vec3 B = normalize(cross(N, T));
          vec3 keyDir = normalize(vec3(0.3, 0.8, 0.5));
          vec3 H = normalize(V + keyDir);

          vec3 B1 = normalize(B + N * 0.18);
          vec3 B2 = normalize(B - N * 0.24);
          float dotBH1 = clamp(dot(B1, H), -1.0, 1.0);
          float dotBH2 = clamp(dot(B2, H), -1.0, 1.0);
          float sinBH1 = sqrt(max(0.0, 1.0 - dotBH1 * dotBH1));
          float sinBH2 = sqrt(max(0.0, 1.0 - dotBH2 * dotBH2));

          float specPrimary = pow(sinBH1, 56.0) * 0.22;
          float specSecondary = pow(sinBH2, 20.0) * 0.26;
          vec3 hairHighlight = vec3(1.0, 0.96, 0.88) * specPrimary + (diffuseColor.rgb + vec3(0.18)) * specSecondary;
          outgoingLight += hairHighlight * smoothstep(-0.1, 0.5, dot(N, keyDir)) * (0.4 + 0.6 * NdotV);
        } else if (uMatType == 4) {
          // 4. REALISTIC CLEARCOAT & METALLIC SPECULAR BOOST
          vec3 keyDir = normalize(vec3(0.3, 0.8, 0.55));
          vec3 H = normalize(V + keyDir);
          float clearcoatSpec = pow(clamp(dot(N, H), 0.0, 1.0), 76.0) * 0.25;
          outgoingLight += vec3(1.0, 0.98, 0.92) * clearcoatSpec + outgoingLight * fresnel * 0.16;
        }
      }
      #include <opaque_fragment>`
    );
  };
}

function updateMaterialRealisticParams(material, realistic) {
  if (!material.userData?.uRealisticShader) return;
  material.userData.uRealisticShader.value = realistic ? 1.0 : 0.0;

  const matName = material.name || '';
  const baseRoughness = material.userData.baseRoughness ?? material.roughness;
  const baseMetalness = material.userData.baseMetalness ?? material.metalness;

  if (realistic) {
    if (matName === 'Mat_Skin') {
      material.roughness = 0.42;
      material.metalness = 0.02;
      material.envMapIntensity = 0.95;
    } else if (matName === 'Mat_Primary' || matName === 'Mat_Secondary') {
      material.roughness = 0.62;
      material.metalness = 0.05;
      material.envMapIntensity = 0.85;
    } else if (matName === 'Mat_Hair') {
      material.roughness = 0.36;
      material.metalness = 0.08;
      material.envMapIntensity = 1.15;
    } else if (matName === 'Mat_AccentGold') {
      material.roughness = 0.14;
      material.metalness = 0.94;
      material.envMapIntensity = 1.65;
    } else if (matName === 'Mat_Dark' || matName === 'Mat_White') {
      material.roughness = 0.24;
      material.envMapIntensity = 1.25;
    }
  } else {
    material.roughness = baseRoughness;
    material.metalness = baseMetalness;
    material.envMapIntensity = 0.5;
  }
}

export function prepareAvatar(root) {
  const owned = new Map();
  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.isSkinnedMesh) node.frustumCulled = false;
    const copy = material => {
      if (!owned.has(material)) {
        const clonedMat = material.clone();
        attachRealisticShader(clonedMat);
        owned.set(material, clonedMat);
      }
      return owned.get(material);
    };
    node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
  });
  const colors = { skinColor: 'Mat_Skin', primaryColor: 'Mat_Primary', secondaryColor: 'Mat_Secondary', hairColor: 'Mat_Hair' };
  const defaults = { bodyStyle: 'masculine', outfitStyle: 'hoodie', hairStyle: 'spiky', accessory: null, realisticShader: true };
  let selection = { ...defaults };
  function apply(options = {}) {
    selection = { ...selection, ...options };
    const { bodyStyle, outfitStyle, hairStyle, accessory, realisticShader } = selection;
    // Only exact module nodes control visibility. GLTFLoader names the
    // generated multi-material primitive children with the same prefix.
    for (const node of root.getObjectByName('Armature').children) {
      if (node.name.startsWith('Body_')) node.visible = node.name === 'Body_' + bodyStyle;
      if (node.name.startsWith('Outfit_')) {
        node.visible = node.name === 'Outfit_' + outfitStyle;
        for (const fit of node.children) fit.visible = fit.name === 'Wear_' + outfitStyle + '_' + bodyStyle;
      }
    }
    for (const bone of root.getObjectByName('Head').children) {
      if (!bone.name.startsWith('Socket_')) continue;
      for (const mod of bone.children) {
        if (mod.name.startsWith('Hair_')) mod.visible = mod.name === 'Hair_' + hairStyle;
        if (mod.name.startsWith('Acc_')) mod.visible = mod.name === 'Acc_' + accessory ||
          (Array.isArray(accessory) && accessory.includes(mod.name.slice(4)));
      }
    }
    for (const [key, name] of Object.entries(colors)) {
      if (selection[key] == null) continue;
      for (const material of owned.values()) if (material.name === name) material.color.set(selection[key]);
    }
    for (const material of owned.values()) {
      updateMaterialRealisticParams(material, Boolean(realisticShader));
    }
  }
  function expression(name, value) {
    root.getObjectByName('Face').traverse(node => {
      const index = node.morphTargetDictionary?.[name];
      if (index !== undefined) node.morphTargetInfluences[index] = Math.max(0, Math.min(1, value));
    });
  }
  apply();
  return { apply, expression, dispose() { for (const material of owned.values()) material.dispose(); } };
}
