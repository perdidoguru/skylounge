/** SkyLounge, Three r169. Call once per SkeletonUtils.clone(scene). */
export function prepareAvatar(root) {
  const owned = new Map();
  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.isSkinnedMesh) node.frustumCulled = false;
    const copy = material => {
      if (!owned.has(material)) owned.set(material, material.clone());
      return owned.get(material);
    };
    node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
  });
  const colors = { skinColor: 'Mat_Skin', primaryColor: 'Mat_Primary', secondaryColor: 'Mat_Secondary', hairColor: 'Mat_Hair' };
  const defaults = { bodyStyle: 'masculine', outfitStyle: 'hoodie', hairStyle: 'spiky', accessory: null };
  let selection = { ...defaults };
  function apply(options = {}) {
    selection = { ...selection, ...options };
    const { bodyStyle, outfitStyle, hairStyle, accessory } = selection;
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
