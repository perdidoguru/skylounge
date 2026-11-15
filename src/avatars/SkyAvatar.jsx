import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Euler, MathUtils, Quaternion } from 'three';
import { prepareAvatar } from './avatar.mjs';

const defaultAppearance = {};

export function SkyAvatar({
  appearance = defaultAppearance, clip = 'idle', talking = false,
  headYaw = 0, headPitch = 0, ...placement
}) {
  const { scene, animations } = useGLTF('/models/avatars.glb');
  const instance = useMemo(() => {
    const root = clone(scene);
    return { root, ui: prepareAvatar(root), head: root.getObjectByName('Head') };
  }, [scene]);
  const { actions } = useAnimations(animations, instance.root);
  const look = useMemo(() => ({ euler: new Euler(0, 0, 0, 'YXZ'), q: new Quaternion() }), []);
  const clock = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 2);
  const mouth = useRef(0);

  useLayoutEffect(() => { instance.ui.apply(appearance); }, [instance, appearance]);
  useEffect(() => {
    const action = actions[clip] || actions.idle;
    action.reset().fadeIn(.16).play();
    return () => { action.fadeOut(.16); };
  }, [actions, clip]);
  useEffect(() => () => {
    instance.ui.dispose();
    const skeletons = new Set();
    instance.root.traverse(n => { if (n.isSkinnedMesh) skeletons.add(n.skeleton); });
    for (const s of skeletons) s.dispose();
  }, [instance]);

  useFrame((_, dt) => {
    clock.current += dt;
    const t = clock.current, elapsed = t - nextBlink.current;
    const blink = elapsed >= 0 && elapsed <= .18 ? Math.sin(Math.PI * elapsed / .18) : 0;
    if (elapsed > .18) nextBlink.current = t + 2.5 + Math.random() * 2.7;
    instance.ui.expression('blink', blink);
    mouth.current = MathUtils.damp(mouth.current, talking ? .50 + .35 * Math.sin(17 * t) : 0, 18, dt);
    instance.ui.expression('talk', mouth.current);
    // useAnimations samples the head track first on each frame.
    look.euler.set(headPitch, headYaw, 0, 'YXZ');
    instance.head.quaternion.multiply(look.q.setFromEuler(look.euler));
  });
  return <primitive object={instance.root} {...placement} dispose={null} />;
}
