import React from 'react';
import { Settings, HelpCircle, X, Monitor, MousePointer, Volume2, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { GraphicsQuality } from '../../../shared/types';

export const SettingsModal: React.FC = () => {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  if (activeModal !== 'settings' && activeModal !== 'help') return null;

  if (activeModal === 'help') {
    return (
      <div
        onClick={() => setActiveModal('none')}
        className="fixed inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/35 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-slate-950/82 border border-white/12 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-sm font-bold text-white">Atalhos & Controles</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2 text-[11px] text-slate-300 max-h-[78vh] overflow-y-auto">
            {[
              {
                key: 'Botão Direito (Segurar)',
                desc: 'Gira a câmera em 3ª pessoa; solte para liberar o cursor.',
              },
              {
                key: 'W, A, S, D / Shift / Espaço',
                desc: 'Andar, correr (Shift) e pular/levantar (Espaço).',
              },
              {
                key: 'Tecla E ou Clique',
                desc: 'Sentar ou levantar de sofás, pufes e poltronas.',
              },
              {
                key: 'Tecla T ou Clique na TV',
                desc: 'Abre o controle do Cinema Social.',
              },
              {
                key: 'Tecla Enter / Esc',
                desc: 'Abre rapidamente o chat ou fecha janelas.',
              },
              {
                key: 'Tecla H',
                desc: 'Alterna o Modo Imersão Cinema (oculta a HUD).',
              },
              {
                key: 'Teclas 1, 2, 3, 4',
                desc: 'Emotes rápidos (Acenar, Dançar, Celebrar, Rir).',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-xl bg-slate-900/65 border border-white/8 flex items-center justify-between gap-3"
              >
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 font-mono font-bold text-[10px] text-amber-300 shrink-0">
                  {item.key}
                </span>
                <span className="text-right text-slate-300">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setActiveModal('none')}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/35 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-slate-950/82 border border-white/12 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-sm font-bold text-white">Configurações</h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Graphics Quality */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              <Monitor className="w-3.5 h-3.5 text-amber-400" /> Qualidade Gráfica
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'low', label: 'Rápido' },
                  { id: 'medium', label: 'Médio' },
                  { id: 'high', label: 'Ultra' },
                ] as { id: GraphicsQuality; label: string }[]
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => updateSettings({ graphicsQuality: q.id })}
                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition ${
                    settings.graphicsQuality === q.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Realistic Shader (Subsurface Scattering + Anisotropic Hair + IBL) */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/65 border border-white/10">
            <div className="pr-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Shader Realista (SSS + IBL)
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Subsurface scattering na pele, brilho anisotrópico nos cabelos, sheen de tecido e reflexos PBR
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ realisticShader: !settings.realisticShader })}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 ${
                settings.realisticShader
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-sm'
                  : 'bg-slate-800 border border-white/10 text-slate-400'
              }`}
            >
              {settings.realisticShader ? 'Ativo' : 'Padrão'}
            </button>
          </div>

          {/* Camera Mouse Sensitivity */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-amber-400" /> Sensibilidade da Câmera
              </span>
              <span className="text-amber-300">{settings.mouseSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={settings.mouseSensitivity}
              onChange={(e) => updateSettings({ mouseSensitivity: Number(e.target.value) })}
              className="w-full h-1.5 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* TV Volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Volume da TV
              </span>
              <span className="text-amber-300">{settings.tvVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.tvVolume}
              onChange={(e) =>
                updateSettings({
                  tvVolume: Number(e.target.value),
                  tvMuted: Number(e.target.value) === 0,
                })
              }
              className="w-full h-1.5 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Sound Effects */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/65 border border-white/8">
            <div>
              <p className="text-[11px] font-bold text-white">Sons de Interface e Passos</p>
              <p className="text-[10px] text-slate-400">Feedback sonoro sutil</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ sfxEnabled: !settings.sfxEnabled })}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                settings.sfxEnabled
                  ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.sfxEnabled ? 'Ativo' : 'Mudo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
