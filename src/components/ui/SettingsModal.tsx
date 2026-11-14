import React from 'react';
import { Settings, HelpCircle, X, Monitor, MousePointer, Volume2 } from 'lucide-react';
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
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <div className="w-full max-w-lg rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-base font-bold text-white">
                Guia de Controles & Interação
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-3 text-xs text-slate-300">
            {[
              {
                key: 'Botão Direito do Mouse (SEGURAR)',
                desc: 'Segure o botão direito e mova o mouse para girar a câmera em 3ª pessoa. Solte para liberar o cursor imediatamente.',
              },
              {
                key: 'W, A, S, D / Setas',
                desc: 'Movimenta seu personagem pela cobertura na direção da câmera.',
              },
              {
                key: 'Shift Esquerdo (Segurar)',
                desc: 'Corre pelo ambiente.',
              },
              {
                key: 'Barra de Espaço',
                desc: 'Pula ou levanta rapidamente de um sofá/poltrona.',
              },
              {
                key: 'Tecla E ou Clique no Assento',
                desc: 'Senta no sofá, pufe, poltrona ou banqueta do bar mais próximo.',
              },
              {
                key: 'Tecla T ou Clique na TV Gigante',
                desc: 'Abre o controle do Cinema Social para trocar vídeos do YouTube, Lives, Twitch ou Kick.',
              },
              {
                key: 'Roda do Mouse (Scroll)',
                desc: 'Aproxima ou afasta o zoom da câmera orbital.',
              },
              {
                key: 'Teclas 1, 2, 3, 4',
                desc: 'Executa emotes rápidos (Acenar, Dançar, Comemorar, Rir).',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-start justify-between gap-4"
              >
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 font-mono font-bold text-amber-300 shrink-0">
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-base font-bold text-white">
              Configurações do Jogo
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Graphics Quality */}
          <div>
            <label className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-300 mb-2">
              <Monitor className="w-4 h-4 text-amber-400" /> Qualidade Gráfica (WebGL)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'low', label: 'Low (Rápido)' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'high', label: 'High (Ultra)' },
                ] as { id: GraphicsQuality; label: string }[]
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => updateSettings({ graphicsQuality: q.id })}
                  className={`py-2.5 px-3 rounded-xl font-bold border transition ${
                    settings.graphicsQuality === q.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Mouse Sensitivity */}
          <div>
            <div className="flex items-center justify-between font-bold text-slate-300 mb-1.5">
              <span className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-amber-400" /> Sensibilidade da Câmera
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
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* TV Volume */}
          <div>
            <div className="flex items-center justify-between font-bold text-slate-300 mb-1.5">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" /> Volume da Televisão
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
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* UI & Footstep Sound Effects */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
            <div>
              <p className="font-bold text-white">Efeitos Sonoros do Ambiente</p>
              <p className="text-[11px] text-slate-400">Passos, cliques de interface e avisos</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ sfxEnabled: !settings.sfxEnabled })}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
                settings.sfxEnabled
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.sfxEnabled ? 'Ativado' : 'Desativado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
