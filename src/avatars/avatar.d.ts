import * as THREE from 'three';
import {
  AvatarAccessory,
  AvatarBodyStyle,
  AvatarHairStyle,
  AvatarOutfitStyle,
} from '../../shared/types';

export interface AvatarAppearanceOptions {
  bodyStyle?: AvatarBodyStyle;
  outfitStyle?: AvatarOutfitStyle | null;
  hairStyle?: AvatarHairStyle | null;
  accessory?: AvatarAccessory | AvatarAccessory[] | null;
  skinColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  hairColor?: string;
  realisticShader?: boolean;
}

export interface PreparedAvatarController {
  apply: (options?: AvatarAppearanceOptions) => void;
  expression: (name: 'blink' | 'talk' | string, value: number) => void;
  dispose: () => void;
}

export function prepareAvatar(root: THREE.Object3D): PreparedAvatarController;
