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
  RefreshCw,
  Rewind,
  FastForward,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useGameStore, tvPlayerBridge } from '../../store/useGameStore';
import { CURATED_MEDIA_PRESETS, parseCommentSourceUrl, parseMediaUrl } from '../../../shared/mediaParser';
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
  const commentListener = useGameStore((s) => s.commentListener);
  const configureCommentListener = useGameStore((s) => s.configureCommentListener);
  const addToast = useGameStore((s) => s.addToast);

  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [forceLive, setForceLive] = useState(false);
  const [syncWithHostOnLoad, setSyncWithHostOnLoad] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);
  const [commentUrlInput, setCommentUrlInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const isHost = hostId === myPlayerId;
  const canControl = isHost || tvState.allowGuestsControl;
  const isYouTubeFamily =
    tvState.platform === 'youtube' || tvState.platform === 'youtube_live';

  const detectedPreview = useMemo(() => {
    if (!inputUrl.trim()) return null;
    return parseMediaUrl(inputUrl, forceLive);
  }, [inputUrl, forceLive]);

  if (activeModal !== 'tv') return null;

  const triggerSyncFlash = () => {
    setSyncFlash(true);
    setTimeout(() => setSyncFlash(false), 1200);
  };

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
    const res = await setTVMedia(
      parsed.url,
      customTitle.trim() || undefined,
      forceLive,
      syncWithHostOnLoad
    );
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
    const res = await setTVMedia(url, title, isLive, true);
    setLoading(false);
    if (!res.ok && res.error) {
      setLocalError(res.error);
    }
  };

  const handleRelativeSeek = (deltaSeconds: number) => {
    soundFX.playClick();
    const cur = tvPlayerBridge.getCurrentTime() || tvState.playbackTime || 0;
    const target = Math.max(0, cur + deltaSeconds);
    sendTVControl('seek', target);
    triggerSyncFlash();
  };

  const handleForceSyncEveryone = () => {
    soundFX.playClick();
    if (isHost || canControl) {
      const cur = tvPlayerBridge.getCurrentTime() || tvState.playbackTime || 0;
      sendTVControl('forceSync', cur);
    } else {
      tvPlayerBridge.syncToServerNow();
    }
    triggerSyncFlash();
  };

  const handleApplyCommentUrl = async (targetUrl?: string) => {
    const raw = (targetUrl ?? commentUrlInput).trim();
    if (!raw) return;
    const parsed = parseCommentSourceUrl(raw);
    if (!parsed.valid) {
      setLocalError(parsed.error || 'Link de comentários inválido.');
      return;
    }
    soundFX.playClick();
    setCommentLoading(true);
    const res = await configureCommentListener({ url: raw, active: true });
    setCommentLoading(false);
    if (!res.ok) {
      setLocalError(res.error || 'Falha ao conectar ouvidor.');
    } else {
      setCommentUrlInput('');
      addToast(`Ouvidor conectado: ${parsed.label}`, 'success');
    }
  };

  const handleSetNpcCount = async (count: number) => {
    soundFX.playClick();
    await configureCommentListener({ npcCount: count });
  };

  const platformBadgeLabel = (p: string) => {
    switch (p) {
      case 'youtube':
        return 'YouTube';
      case 'youtube_live':
        return 'YouTube Live';
      case 'twitch':
        return 'Twitch';
      case 'kick':
        return 'Kick';
      case 'ambient':
        return '3D Nativo';
      default:
        return p;
    }
  };

  return (
    <div
      onClick={() => setActiveModal('none')}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/35 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-slate-950/82 border border-white/12 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Slim Header */}
        <div className="px-4 py-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Tv className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-white">Cinema Social</h2>
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {platformBadgeLabel(tvState.platform)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Now Playing & Playback Bar */}
          <div className="p-3 rounded-xl bg-slate-900/65 border border-white/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  {tvState.isLive ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 border border-rose-400/30 text-[9px] font-bold uppercase text-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" /> LIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-500/15 border border-sky-400/30 text-[9px] font-bold uppercase text-sky-300">
                      VOD
                    </span>
                  )}

                  {isYouTubeFamily && (
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase border ${
                        tvState.syncEnabled
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                          : 'bg-slate-800 border-white/10 text-slate-400'
                      }`}
                    >
                      <Radio className="w-2.5 h-2.5" />
                      {tvState.syncEnabled ? 'Sync Live Ativo' : 'Sync Manual'}
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400 truncate">
                    • {tvState.updatedBy}
                  </span>
                </div>
                <h3 className="font-display text-xs font-bold text-white truncate">
                  {tvState.title}
                </h3>
              </div>

              {/* Compact Playback Controls */}
              <div className="flex flex-wrap items-center gap-1 shrink-0">
                {canControl && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      const cur = tvPlayerBridge.getCurrentTime() || tvState.playbackTime || 0;
                      sendTVControl(tvState.isPlaying ? 'pause' : 'play', cur);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition"
                  >
                    {tvState.isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Play
                      </>
                    )}
                  </button>
                )}

                {canControl && isYouTubeFamily && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRelativeSeek(-10)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-0.5 transition"
                      title="Voltar 10s"
                    >
                      <Rewind className="w-3 h-3" /> -10s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelativeSeek(10)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-0.5 transition"
                      title="Avançar 10s"
                    >
                      <FastForward className="w-3 h-3" /> +10s
                    </button>
                    {!tvState.isLive && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          sendTVControl('seek', 0);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition"
                        title="Reiniciar (0:00)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Watch-Party Live Synchronization Bar */}
            {isYouTubeFamily && (
              <div className="pt-2 border-t border-white/8 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tvState.syncEnabled}
                    disabled={!canControl}
                    onChange={(e) => {
                      soundFX.playClick();
                      const cur = tvPlayerBridge.getCurrentTime() || tvState.playbackTime || 0;
                      sendTVControl('toggleSync', cur, undefined, e.target.checked);
                    }}
                    className="accent-emerald-400 w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span>Sincronização Live com o Host</span>
                </label>

                <button
                  type="button"
                  onClick={handleForceSyncEveryone}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                    syncFlash
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/30'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${syncFlash ? 'animate-spin' : ''}`} />
                  {syncFlash
                    ? 'Sincronizado!'
                    : canControl
                    ? 'Sincronizar Todos'
                    : 'Sincronizar com Host'}
                </button>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {(tvEmbedError || localError) && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-start gap-2.5 text-[11px] text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>{localError || tvEmbedError}</p>
            </div>
          )}

          {/* Compact Volume & Direct Click Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="px-3 py-2 rounded-xl bg-slate-900/55 border border-white/8 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => updateSettings({ tvMuted: !settings.tvMuted })}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
              >
                {settings.tvMuted || settings.tvVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
                  <span>Volume Local</span>
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
                  className="w-full h-1.5 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-900/55 border border-white/8 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3 text-amber-400" /> Clique na Tela
                </p>
                <p className="text-[10px] text-slate-400 truncate">Controles internos da TV</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTVInteractiveMode(!tvInteractiveMode);
                  setActiveModal('none');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
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
          <form
            onSubmit={handleLoadUrl}
            className="space-y-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" /> Link (YouTube, Live, Twitch ou Kick)
              </label>
              {detectedPreview && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    detectedPreview.valid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {detectedPreview.valid
                    ? platformBadgeLabel(detectedPreview.platform)
                    : 'URL Inválida'}
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setLocalError(null);
                }}
                disabled={!canControl}
                placeholder="Cole a URL do vídeo ou transmissão..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-white/12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canControl || loading || !inputUrl.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] shrink-0 transition"
              >
                {loading ? '...' : 'Transmitir'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <input
                type="text"
                maxLength={60}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                disabled={!canControl}
                placeholder="Título opcional..."
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-white/10 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 w-40"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncWithHostOnLoad}
                    onChange={(e) => setSyncWithHostOnLoad(e.target.checked)}
                    className="accent-emerald-400 rounded"
                  />
                  Sincronizar Todos
                </label>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceLive}
                    onChange={(e) => setForceLive(e.target.checked)}
                    className="accent-rose-400 rounded"
                  />
                  Modo Live (DVR)
                </label>
              </div>
            </div>
          </form>

          {/* Compact Curated Channels */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Canais Rápidos
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {CURATED_MEDIA_PRESETS.map((preset) => {
                const isSelected = tvState.url === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!canControl || loading}
                    onClick={() => handleSelectPreset(preset.url, preset.title, preset.isLive)}
                    className={`p-2 rounded-xl border text-left transition flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-slate-900/55 border-white/8 hover:border-amber-400/40 text-slate-200'
                    } disabled:opacity-50`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate">{preset.title}</div>
                      <div className="text-[9px] text-slate-400 truncate">{preset.badge}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Comment Listener & 0-6 Spectator NPCs */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                  Ouvidor de Comentários & NPCs
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-slate-300 truncate max-w-[180px]">
                {commentListener?.label || 'Desconectado'}
              </span>
            </div>

            {/* Comment Listener URL Input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={commentUrlInput}
                onChange={(e) => setCommentUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCommentUrl();
                  }
                }}
                placeholder={commentListener?.url || 'Link do chat (Twitch, YouTube ou Kick)...'}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-white/12 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={commentLoading || !commentUrlInput.trim()}
                onClick={() => handleApplyCommentUrl()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-[10px] shrink-0 transition"
              >
                {commentLoading ? '...' : 'Ouvir'}
              </button>
              {tvState.platform !== 'ambient' && tvState.url && (
                <button
                  type="button"
                  onClick={() => handleApplyCommentUrl(tvState.url)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-800/80 border border-white/10 text-amber-300 hover:border-amber-400/50 shrink-0 transition"
                  title="Sincronizar ouvidor com o link atual da TV"
                >
                  Usar TV
                </button>
              )}
            </div>

            {/* 0 to 6 NPC Selector */}
            <div className="pt-2 border-t border-white/8 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>NPCs no Lounge (0 a 6):</span>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((num) => {
                  const active = (commentListener?.npcCount ?? 3) === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSetNpcCount(num)}
                      className={`w-6 h-6 rounded-lg text-[10px] font-bold border transition ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Host Permission Toggle */}
          {isHost && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {tvState.allowGuestsControl ? (
                  <Unlock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                )}
                <span className="text-[11px] text-slate-200 truncate">
                  {tvState.allowGuestsControl
                    ? 'Convidados podem trocar vídeos'
                    : 'Controle exclusivo do Anfitrião'}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  sendTVControl('toggleGuests', undefined, !tvState.allowGuestsControl)
                }
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold shrink-0 transition"
              >
                {tvState.allowGuestsControl ? 'Restringir' : 'Liberar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
