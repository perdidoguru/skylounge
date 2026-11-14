import React from 'react';
import {
  AvatarAccessory,
  AvatarBodyStyle,
  AvatarCustomization,
  AvatarHairStyle,
  AvatarOutfitStyle,
} from '../../../shared/types';
import { soundFX } from '../../utils/soundEffects';

interface AvatarCustomizerPanelProps {
  customization: AvatarCustomization;
  onChange: (partial: Partial<AvatarCustomization>) => void;
  compact?: boolean;
}

const SKIN_COLORS = [
  '#f9dcc4',
  '#f1c29d',
  '#e0a370',
  '#c68642',
  '#8d5524',
  '#523218',
];

const PRIMARY_COLORS = [
  '#e5a95c',
  '#ec4899',
  '#a855f7',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f8fafc',
  '#14b8a6',
];

const SECONDARY_COLORS = [
  '#1e2436',
  '#0f172a',
  '#31102f',
  '#334155',
  '#3f271d',
  '#142e24',
  '#e2e8f0',
  '#7c2d12',
];

const HAIR_COLORS = [
  '#1c1412',
  '#3f2618',
  '#7c4728',
  '#d99b43',
  '#f3d078',
  '#b91c1c',
  '#ec4899',
  '#a855f7',
  '#38bdf8',
  '#cbd5e1',
];

const OUTFIT_STYLES: { id: AvatarOutfitStyle; label: string; tag?: string }[] = [
  { id: 'dress', label: 'Vestido Velvet', tag: 'Fem' },
  { id: 'skirt_set', label: 'Cropped & Saia', tag: 'Fem' },
  { id: 'offshoulder', label: 'Tricô Off-Shoulder', tag: 'Fem' },
  { id: 'jumpsuit', label: 'Macacão Chic', tag: 'Fem' },
  { id: 'jacket', label: 'Bomber Jacket' },
  { id: 'hoodie', label: 'Street Hoodie' },
  { id: 'blazer', label: 'Lounge Blazer' },
  { id: 'vest', label: 'Neo Puffer' },
];

const HAIR_STYLES: { id: AvatarHairStyle; label: string }[] = [
  { id: 'long_waves', label: 'Longo Ondulado' },
  { id: 'long_straight', label: 'Liso Longo' },
  { id: 'twintails', label: 'Maria-Chiquinha' },
  { id: 'high_bun', label: 'Coque Alto' },
  { id: 'bob', label: 'Channel Bob' },
  { id: 'ponytail', label: 'Rabo de Cavalo' },
  { id: 'waves', label: 'Wolf Waves' },
  { id: 'spiky', label: 'Modern Crop' },
  { id: 'curly', label: 'Cachos Afro' },
];

const ACCESSORIES: { id: AvatarAccessory; label: string }[] = [
  { id: 'none', label: 'Nenhum' },
  { id: 'earrings', label: 'Brincos Argola' },
  { id: 'tiara', label: 'Tiara Cristal' },
  { id: 'bow', label: 'Laço Cetim' },
  { id: 'glasses', label: 'Óculos' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'crown', label: 'Coroa VIP' },
  { id: 'beanie', label: 'Touca' },
];

export const AvatarCustomizerPanel: React.FC<AvatarCustomizerPanelProps> = ({
  customization,
  onChange,
  compact = false,
}) => {
  const currentBody: AvatarBodyStyle =
    customization.bodyStyle ||
    (['dress', 'skirt_set', 'offshoulder', 'jumpsuit'].includes(customization.outfitStyle)
      ? 'feminine'
      : 'masculine');

  const handleSelectBodyStyle = (style: AvatarBodyStyle) => {
    soundFX.playClick();
    if (style === 'feminine') {
      const isCurrentlyMascHair = ['spiky'].includes(customization.hairStyle);
      const isCurrentlyMascOutfit = ['jacket', 'vest'].includes(customization.outfitStyle);
      onChange({
        bodyStyle: 'feminine',
        ...(isCurrentlyMascHair ? { hairStyle: 'long_waves' } : {}),
        ...(isCurrentlyMascOutfit ? { outfitStyle: 'dress', primaryColor: '#ec4899' } : {}),
      });
    } else {
      const isCurrentlyFemOutfit = ['dress', 'skirt_set', 'offshoulder', 'jumpsuit'].includes(
        customization.outfitStyle
      );
      onChange({
        bodyStyle: 'masculine',
        ...(isCurrentlyFemOutfit ? { outfitStyle: 'jacket' } : {}),
      });
    }
  };

  return (
    <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-3.5'}`}>
      {/* Display Name */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-300/90 mb-1">
          Nome de Exibição
        </label>
        <input
          type="text"
          maxLength={22}
          value={customization.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Seu nome no SkyLounge..."
          className="w-full px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 transition"
        />
      </div>

      {/* Body Silhouette & Facial Expression Toggle (Feminino / Masculino) */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Estilo & Expressão do Avatar
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectBodyStyle('feminine')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
              currentBody === 'feminine'
                ? 'bg-pink-500/20 border-pink-400 text-pink-200 shadow-sm'
                : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <span>✨ Feminino</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectBodyStyle('masculine')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
              currentBody === 'masculine'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <span>⚡ Masculino</span>
          </button>
        </div>
      </div>

      {/* Skin Tone */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Tom de Pele
        </label>
        <div className="flex items-center gap-2">
          {SKIN_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ skinColor: hex });
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                customization.skinColor === hex
                  ? 'border-amber-400 scale-110 shadow-md shadow-amber-500/20'
                  : 'border-white/15 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Hair Style & Hair Color */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Corte de Cabelo 3D & Cor
        </label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ hairStyle: h.id });
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border truncate transition ${
                customization.hairStyle === h.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {HAIR_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ hairColor: hex });
              }}
              className={`w-5 h-5 rounded-full border-2 transition ${
                customization.hairColor === hex
                  ? 'border-amber-400 scale-110'
                  : 'border-white/15 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Outfit Style */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Figurino
        </label>
        <div className="grid grid-cols-2 gap-1">
          {OUTFIT_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({
                  outfitStyle: style.id,
                  ...(style.tag === 'Fem' ? { bodyStyle: 'feminine' } : {}),
                });
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition flex items-center justify-between ${
                customization.outfitStyle === style.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <span className="truncate">{style.label}</span>
              {style.tag && (
                <span className="text-[9px] px-1 rounded bg-pink-500/20 text-pink-300 font-bold ml-1">
                  {style.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Primary & Secondary Outfit Colors */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Cor Principal
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRIMARY_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onChange({ primaryColor: hex });
                }}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  customization.primaryColor === hex
                    ? 'border-amber-400 scale-110'
                    : 'border-white/15 hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Cor Secundária
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SECONDARY_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onChange({ secondaryColor: hex });
                }}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  customization.secondaryColor === hex
                    ? 'border-amber-400 scale-110'
                    : 'border-white/15 hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Acessório
        </label>
        <div className="grid grid-cols-4 gap-1">
          {ACCESSORIES.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ accessory: acc.id });
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border truncate transition ${
                customization.accessory === acc.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
