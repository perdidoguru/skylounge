import React, { useState, useMemo } from 'react';
import {
  Tv,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Link2,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  MousePointerClick,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { CURATED_MEDIA_PRESETS, parseMediaUrl } from '../../../shared/mediaParser';
import { soundFX } from '../../utils/soundEffects';

export const CinemaControlModal: React.FC = () => {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const tvState = useGameStore((s) => s.tvState);
  const hostId = useGameStore((s) => s.hostId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setTVMedia = useGameStore((s) => s.setTVMedia);
  const sendTVControl = useGameStore((s) => s.sendTVControl);
  const tvEmbedError = useGameStore((s) => s.tvEmbedError);
  const tvInteractiveMode = useGameStore((s) => s.tvInteractiveMode);
  const setTVInteractiveMode = useGameStore((s) => s.setTVInteractiveMode);

  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [forceLive, setForceLive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isHost = hostId === myPlayerId;
  const canControl = isHost || tvState.allowGuestsControl;

  // Live preview of detected platform as user types a URL
  const detectedPreview = useMemo(() => {
    if (!inputUrl.trim()) return null;
    return parseMediaUrl(inputUrl, forceLive);
  }, [inputUrl, forceLive]);

  if (activeModal !== 'tv') return null;

  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!canControl) {
      setLocalError('Apenas o anfitrião pode alterar a mídia neste momento.');
      return;
    }
    const parsed = parseMediaUrl(inputUrl, forceLive);
    if (!parsed.valid) {
      setLocalError(parsed.error || 'URL inválida.');
      return;
    }
    setLoading(true);
    const res = await setTVMedia(parsed.url, customTitle.trim() || undefined, forceLive);
    setLoading(false);
    if (!res.ok) {
      setLocalError(res.error || 'Não foi possível carregar esta URL.');
    } else {
      setInputUrl('');
      setCustomTitle('');
    }
  };

  const handleSelectPreset = async (url: string, title: string, isLive: boolean) => {
    setLocalError(null);
    if (!canControl) {
      setLocalError('Apenas o anfitrião pode alterar a mídia neste momento.');
      return;
    }
    soundFX.playClick();
    setLoading(true);
    const res = await setTVMedia(url, title, isLive);
    setLoading(false);
    if (!res.ok && res.error) {
      setLocalError(res.error);
    }
  };

  const platformBadgeLabel = (p: string) => {
    switch (p) {
      case 'youtube':
        return 'YouTube VOD';
      case 'youtube_live':
        return 'YouTube Live';
      case 'twitch':
        return 'Twitch Live';
      case 'kick':
        return 'Kick Live';
      case 'ambient':
        return '3D Nativo';
      default:
        return p;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                Central de Cinema Social 3D
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {platformBadgeLabel(tvState.platform)}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sincronizado em tempo real com todos os participantes da cobertura
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Now Playing Status Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {tvState.isLive ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-[10px] font-bold uppercase text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" /> AO VIVO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-bold uppercase text-sky-300">
                    SOB DEMANDA
                  </span>
                )}
                <span className="text-[11px] text-slate-400 truncate">
                  Por <strong className="text-slate-200">{tvState.updatedBy}</strong>
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-white truncate">
                {tvState.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                {tvState.url}
              </p>
            </div>

            {/* Playback & Local Volume Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {canControl && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      sendTVControl(tvState.isPlaying ? 'pause' : 'play');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                    title={tvState.isPlaying ? 'Pausar para todos' : 'Reproduzir para todos'}
                  >
                    {tvState.isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" /> Reproduzir
                      </>
                    )}
                  </button>

                  {!tvState.isLive && tvState.platform === 'youtube' && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        sendTVControl('seek', 0);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title="Reiniciar Vídeo do Início (0:00)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Provider Embed Error or Restriction Alert */}
          {(tvEmbedError || localError) && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-100">Aviso de Reprodução</p>
                <p className="mt-0.5">{localError || tvEmbedError}</p>
              </div>
            </div>
          )}

          {/* Local Audio Volume & Interactive Player Pointer Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateSettings({ tvMuted: !settings.tvMuted })}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
              >
                {settings.tvMuted || settings.tvVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                  <span>Volume Local da TV</span>
                  <span>{settings.tvMuted ? 'Mudo' : `${settings.tvVolume}%`}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.tvMuted ? 0 : settings.tvVolume}
                  onChange={(e) =>
                    updateSettings({
                      tvVolume: Number(e.target.value),
                      tvMuted: Number(e.target.value) === 0,
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-amber-400" /> Clique Direto na Tela
                </p>
                <p className="text-[11px] text-slate-400">
                  Para clicar em controles internos da Twitch/Kick
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTVInteractiveMode(!tvInteractiveMode);
                  setActiveModal('none');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  tvInteractiveMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
                }`}
              >
                {tvInteractiveMode ? 'Ativo' : 'Ativar'}
              </button>
            </div>
          </div>

          {/* URL Input Form */}
          <form onSubmit={handleLoadUrl} className="space-y-3 p-4 rounded-2xl bg-slate-900/75 border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" /> Inserir URL (YouTube, YouTube Live, Twitch ou Kick)
              </label>
              {detectedPreview && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    detectedPreview.valid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {detectedPreview.valid
                    ? `Detectado: ${platformBadgeLabel(detectedPreview.platform)}`
                    : 'URL Inválida'}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setLocalError(null);
                }}
                disabled={!canControl}
                placeholder="Cole o link do YouTube, Live, canal da Twitch ou Kick..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canControl || loading || !inputUrl.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-bold text-xs shrink-0 transition"
              >
                {loading ? 'Carregando...' : 'Transmitir na TV'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <input
                type="text"
                maxLength={60}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                disabled={!canControl}
                placeholder="Título opcional para exibir no HUD..."
                className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 w-full sm:w-64"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceLive}
                  onChange={(e) => setForceLive(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
                Marcar como Transmissão Ao Vivo (Live)
              </label>
            </div>
          </form>

          {/* Curated One-Click Channels & Videos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Canais & Vídeos Recomendados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CURATED_MEDIA_PRESETS.map((preset) => {
                const isSelected = tvState.url === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!canControl || loading}
                    onClick={() => handleSelectPreset(preset.url, preset.title, preset.isLive)}
                    className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-slate-900/70 border-white/10 hover:border-amber-400/40 text-slate-200'
                    } disabled:opacity-50`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{preset.title}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {preset.subtitle}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-white/10 text-[10px] font-semibold text-amber-300 shrink-0">
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Permission Management */}
          {isHost && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {tvState.allowGuestsControl ? (
                  <Unlock className="w-4 h-4 text-amber-300" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-300" />
                )}
                <div>
                  <p className="text-xs font-bold text-amber-200">
                    Permissão de Controle da Sala (Anfitrião)
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {tvState.allowGuestsControl
                      ? 'Qualquer participante pode sugerir e trocar vídeos na TV.'
                      : 'Somente você (Anfitrião) pode alterar o vídeo da TV.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  sendTVControl('toggleGuests', undefined, !tvState.allowGuestsControl)
                }
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shrink-0 transition"
              >
                {tvState.allowGuestsControl ? 'Restringir ao Host' : 'Liberar Convidados'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
