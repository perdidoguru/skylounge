import React from 'react';
import {
  AvatarAccessory,
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
  '#3b82f6',
  '#ec4899',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#f8fafc',
  '#14b8a6',
];

const SECONDARY_COLORS = [
  '#1e2436',
  '#0f172a',
  '#334155',
  '#3f271d',
  '#31102f',
  '#142e24',
  '#e2e8f0',
  '#7c2d12',
];

const HAIR_COLORS = [
  '#1c1412',
  '#3f2618',
  '#7c4728',
  '#d99b43',
  '#b91c1c',
  '#cbd5e1',
  '#a855f7',
  '#38bdf8',
];

const OUTFIT_STYLES: { id: AvatarOutfitStyle; label: string }[] = [
  { id: 'jacket', label: 'Bomber Jacket' },
  { id: 'hoodie', label: 'Street Hoodie' },
  { id: 'blazer', label: 'Lounge Blazer' },
  { id: 'vest', label: 'Neo Puffer' },
];

const HAIR_STYLES: { id: AvatarHairStyle; label: string }[] = [
  { id: 'spiky', label: 'Textured Crop' },
  { id: 'bob', label: 'Cyber Bob' },
  { id: 'curly', label: 'Cachos' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'waves', label: 'Ondulado' },
];

const ACCESSORIES: { id: AvatarAccessory; label: string }[] = [
  { id: 'none', label: 'Nenhum' },
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
  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      {/* Display Name */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
          Nome de Exibição
        </label>
        <input
          type="text"
          maxLength={22}
          value={customization.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Seu nome no SkyLounge..."
          className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 transition"
        />
      </div>

      {/* Skin Tone */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                customization.skinColor === hex
                  ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                  : 'border-white/15 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Outfit Style */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Estilo de Roupa
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {OUTFIT_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ outfitStyle: style.id });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                customization.outfitStyle === style.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary & Secondary Outfit Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                className={`w-6 h-6 rounded-full border-2 transition ${
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
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                className={`w-6 h-6 rounded-full border-2 transition ${
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

      {/* Hair Style & Hair Color */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Cabelo & Cor
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ hairStyle: h.id });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                customization.hairStyle === h.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {HAIR_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ hairColor: hex });
              }}
              className={`w-6 h-6 rounded-full border-2 transition ${
                customization.hairColor === hex
                  ? 'border-amber-400 scale-110'
                  : 'border-white/15 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Acessório
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ACCESSORIES.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChange({ accessory: acc.id });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
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
