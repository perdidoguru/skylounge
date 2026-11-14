import React, { useState, useEffect } from 'react';
import {
  Tv,
  Users,
  Settings,
  HelpCircle,
  Share2,
  LogOut,
  Hand,
  Music,
  PartyPopper,
  Smile,
  Armchair,
  User,
  Volume2,
  MousePointerClick,
  Eye,
  EyeOff,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { SEAT_MAP } from '../../../shared/seats';
import { parseCommentSourceUrl } from '../../../shared/mediaParser';
import { ChatPanel } from './ChatPanel';
import { CinemaControlModal } from './CinemaControlModal';
import { ParticipantsModal } from './ParticipantsModal';
import { SettingsModal } from './SettingsModal';
import { soundFX } from '../../utils/soundEffects';

export const HUD: React.FC = () => {
  const roomId = useGameStore((s) => s.roomId);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const hostId = useGameStore((s) => s.hostId);
  const connected = useGameStore((s) => s.connected);
  const tvState = useGameStore((s) => s.tvState);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const nearbySeatId = useGameStore((s) => s.nearbySeatId);
  const nearTV = useGameStore((s) => s.nearTV);
  const activeEmote = useGameStore((s) => s.activeEmote);
  const activeModal = useGameStore((s) => s.activeModal);
  const tvAutoplayBlocked = useGameStore((s) => s.tvAutoplayBlocked);
  const tvInteractiveMode = useGameStore((s) => s.tvInteractiveMode);
  const setTVInteractiveMode = useGameStore((s) => s.setTVInteractiveMode);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const sitOnSeat = useGameStore((s) => s.sitOnSeat);
  const standUp = useGameStore((s) => s.standUp);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const addToast = useGameStore((s) => s.addToast);
  const toasts = useGameStore((s) => s.toasts);
  const commentListener = useGameStore((s) => s.commentListener);
  const configureCommentListener = useGameStore((s) => s.configureCommentListener);

  const [minimalZenMode, setMinimalZenMode] = useState(false);
  const [showSeatedHint, setShowSeatedHint] = useState(false);
  const [commentFeedOpen, setCommentFeedOpen] = useState(true);
  const [hudCommentUrl, setHudCommentUrl] = useState('');

  const playerCount = Object.keys(players).length;
  const isHost = myPlayerId === hostId;
  const nearbySeat = nearbySeatId ? SEAT_MAP[nearbySeatId] : null;
  const currentSeat = mySeatId ? SEAT_MAP[mySeatId] : null;

  // Show the seated hint only for 3 seconds after sitting down so it never blocks the TV view
  useEffect(() => {
    if (mySeatId) {
      setShowSeatedHint(true);
      const timer = setTimeout(() => setShowSeatedHint(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSeatedHint(false);
    }
  }, [mySeatId]);

  // Keyboard shortcut [H] to toggle Cinema Immersion / Zen Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== 'none') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyH') {
        setMinimalZenMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const handleCopyInvite = () => {
    soundFX.playClick();
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        addToast(`Convite copiado (${roomId})`, 'success');
      })
      .catch(() => {
        addToast(`Sala: ${roomId}`, 'info');
      });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 select-none">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Unified Minimalist Status + Invite + Now Playing Capsule */}
        {!minimalZenMode ? (
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <div className="h-8 px-2.5 rounded-full bg-slate-950/45 hover:bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 opacity-75 hover:opacity-100 transition-all duration-200">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  connected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                }`}
                title={connected ? 'Online' : 'Reconectando...'}
              />
              <span className="font-display font-bold text-[11px] text-white/90 tracking-wider hidden sm:inline">
                SKYLOUNGE
              </span>

              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-400/25 font-mono text-[10px] font-bold transition"
                title="Clique para copiar o link de convite da sala"
              >
                <span>{roomId}</span>
                {isHost && <span title="Anfitrião">👑</span>}
                <Share2 className="w-2.5 h-2.5 ml-0.5 opacity-80" />
              </button>

              <span className="w-px h-3.5 bg-white/10" />

              {/* Compact Now Playing Trigger */}
              <button
                type="button"
                onClick={() => setActiveModal('tv')}
                className="flex items-center gap-1.5 text-[11px] text-slate-200 hover:text-amber-300 transition max-w-[170px] sm:max-w-[220px]"
                title="Abrir Controle do Cinema Social (Tecla T)"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {tvState.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping shrink-0" />
                )}
                <span className="truncate font-medium">{tvState.title}</span>
              </button>
            </div>

            {/* Autoplay Unmute Pill (only if browser muted initial video) */}
            {tvAutoplayBlocked && (
              <button
                type="button"
                onClick={() => updateSettings({ tvMuted: false, tvVolume: 75 })}
                className="h-8 px-3 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-lg flex items-center gap-1.5 transition"
              >
                <Volume2 className="w-3.5 h-3.5" /> Ativar Áudio
              </button>
            )}

            {/* Direct TV Interactive Mode Pill */}
            {tvInteractiveMode && (
              <button
                type="button"
                onClick={() => setTVInteractiveMode(false)}
                className="h-8 px-3 rounded-full bg-violet-600/85 hover:bg-violet-500 text-white font-semibold text-[11px] shadow-lg border border-violet-300/30 flex items-center gap-1.5 transition"
              >
                <MousePointerClick className="w-3.5 h-3.5" /> Sair do Clique na TV
              </button>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Top-Right: Sleek Minimalist Icon Dock */}
        <div className="pointer-events-auto flex items-center gap-1 h-8 px-1.5 rounded-full bg-slate-950/45 hover:bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-lg opacity-75 hover:opacity-100 transition-all duration-200">
          {!minimalZenMode && (
            <>
              <button
                type="button"
                onClick={() => setActiveModal('tv')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/30 text-[11px] font-semibold transition"
                title="Controle da TV (Tecla T)"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">TV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('avatar')}
                className="p-1.5 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition"
                title="Personalizar Avatar"
              >
                <User className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('participants')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 text-[11px] font-semibold transition"
                title="Participantes na Sala"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{playerCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('settings')}
                className="p-1.5 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition"
                title="Configurações"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('help')}
                className="p-1.5 rounded-full text-slate-300 hover:text-amber-300 hover:bg-white/10 transition"
                title="Controles e Ajuda"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMinimalZenMode(!minimalZenMode)}
            className={`p-1.5 rounded-full transition ${
              minimalZenMode
                ? 'bg-amber-500/25 text-amber-300'
                : 'text-slate-300 hover:text-amber-300 hover:bg-white/10'
            }`}
            title={minimalZenMode ? 'Mostrar Interface (Tecla H)' : 'Modo Imersão Cinema (Tecla H)'}
          >
            {minimalZenMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {!minimalZenMode && (
            <button
              type="button"
              onClick={leaveRoom}
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition"
              title="Sair para o Lobby"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* COMPACT TOAST NOTIFICATIONS */}
      <div className="fixed top-12 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg text-[11px] font-medium transition-all ${
              t.type === 'success'
                ? 'bg-emerald-950/75 border-emerald-400/30 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-amber-950/75 border-amber-400/30 text-amber-200'
                : t.type === 'error'
                ? 'bg-rose-950/75 border-rose-400/30 text-rose-200'
                : 'bg-slate-950/75 border-white/10 text-slate-200'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* BOTTOM CONTEXTUAL PROMPTS & ULTRA-SLIM EMOTE DOCK */}
      {!minimalZenMode && (
        <div className="flex flex-col items-center gap-1.5">
          {/* Contextual Prompts (Fade out automatically when seated so they never block the TV!) */}
          <div className="pointer-events-auto flex items-center justify-center">
            {currentSeat && showSeatedHint && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 border border-white/10 text-[11px] text-slate-200 backdrop-blur-md shadow-md">
                <Armchair className="w-3 h-3 text-amber-400" />
                <span>{currentSeat.label}</span>
                <span className="text-[10px] text-amber-300 font-mono">[E / Espaço] levantar</span>
              </div>
            )}

            {!currentSeat && nearbySeat && (
              <button
                type="button"
                onClick={() => sitOnSeat(nearbySeat.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/65 hover:bg-slate-900/85 border border-amber-400/40 text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition"
              >
                <Armchair className="w-3.5 h-3.5 text-amber-400" />
                <span>Sentar • {nearbySeat.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px]">
                  E
                </span>
              </button>
            )}

            {!currentSeat && !nearbySeat && nearTV && (
              <button
                type="button"
                onClick={() => setActiveModal('tv')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 hover:bg-slate-900/85 border border-white/12 text-[11px] font-medium text-slate-200 shadow-lg backdrop-blur-md transition"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Controle da TV</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-amber-300 font-mono text-[9px]">
                  T
                </span>
              </button>
            )}
          </div>

          {/* Ultra-Slim Translucent Emote & Seat Mini-Dock */}
          <div className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-full bg-slate-950/40 hover:bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-lg opacity-55 hover:opacity-100 transition-all duration-200">
            {currentSeat && (
              <>
                <button
                  type="button"
                  onClick={() => standUp()}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-semibold transition"
                  title="Levantar do Assento (Tecla E ou Espaço)"
                >
                  <Armchair className="w-3 h-3" />
                  <span>Levantar</span>
                </button>
                <span className="w-px h-3.5 bg-white/10 mx-0.5" />
              </>
            )}

            {[
              { id: 'wave' as const, label: 'Acenar', key: '1', icon: Hand },
              { id: 'dance' as const, label: 'Dançar', key: '2', icon: Music },
              { id: 'cheer' as const, label: 'Celebrar', key: '3', icon: PartyPopper },
              { id: 'laugh' as const, label: 'Rir', key: '4', icon: Smile },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeEmote === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => triggerEmote(item.id)}
                  title={`${item.label} (Tecla ${item.key})`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] opacity-60 font-mono">{item.key}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimalist Collapsible Chat Pill / Drawer (Bottom-Left) */}
      {!minimalZenMode && (
        <div className="fixed bottom-0 left-0 pointer-events-auto">
          <ChatPanel />
        </div>
      )}

      {/* Compact Comment Listener & 0-6 NPC Widget (Bottom-Right) */}
      {!minimalZenMode && (
        <div className="fixed bottom-3 right-3 z-20 pointer-events-auto flex flex-col items-end">
          {!commentFeedOpen ? (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setCommentFeedOpen(true);
              }}
              className="h-8 px-3 rounded-full bg-slate-950/55 hover:bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 text-[11px] text-slate-200 hover:text-amber-300 opacity-75 hover:opacity-100 transition"
              title="Abrir Ouvidor de Comentários & NPCs"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[130px] font-medium">
                {commentListener?.label || 'Ouvidor'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                {commentListener?.npcCount ?? 0} NPCs
              </span>
              <ChevronUp className="w-3 h-3 opacity-70" />
            </button>
          ) : (
            <div className="w-64 sm:w-72 rounded-2xl bg-slate-950/65 hover:bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-xl overflow-hidden flex flex-col text-[11px] opacity-85 hover:opacity-100 transition-all duration-200">
              {/* Compact Header */}
              <div className="px-2.5 py-1.5 bg-slate-900/60 border-b border-white/10 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Radio className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                  <span className="font-display font-bold text-[10px] text-white truncate">
                    {commentListener?.label || 'Ouvidor de Comentários'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setCommentFeedOpen(false);
                  }}
                  className="p-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Minimizar Ouvidor"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Compact URL Input & Presets */}
              <div className="p-2 border-b border-white/8 space-y-1.5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const raw = hudCommentUrl.trim();
                    if (!raw) return;
                    const parsed = parseCommentSourceUrl(raw);
                    if (!parsed.valid) {
                      addToast(parsed.error || 'Link inválido', 'warning');
                      return;
                    }
                    soundFX.playClick();
                    await configureCommentListener({ url: raw, active: true });
                    setHudCommentUrl('');
                    addToast(`Ouvindo: ${parsed.label}`, 'success');
                  }}
                  className="flex gap-1"
                >
                  <input
                    type="text"
                    value={hudCommentUrl}
                    onChange={(e) => setHudCommentUrl(e.target.value)}
                    placeholder="Link Twitch / YouTube / Kick..."
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 transition"
                  >
                    OK
                  </button>
                </form>

                {/* Sync with TV link + 0..6 NPC Selector */}
                <div className="flex items-center justify-between gap-1">
                  <div>
                    {tvState.platform !== 'ambient' && tvState.url && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          configureCommentListener({
                            url: tvState.url,
                            active: true,
                          });
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900/70 border border-white/10 text-amber-300 hover:border-amber-400/50 transition"
                        title="Ouvir os comentários do vídeo/live atual da TV"
                      >
                        Usar Link da TV
                      </button>
                    )}
                  </div>

                  {/* Compact 0-6 NPC selector */}
                  <div className="flex items-center gap-0.5" title="Quantidade de NPCs (0 a 6)">
                    <span className="text-[9px] text-slate-400 mr-0.5">NPCs:</span>
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                      const active = (commentListener?.npcCount ?? 3) === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            soundFX.playClick();
                            configureCommentListener({ npcCount: n });
                          }}
                          className={`w-4 h-4 rounded text-[9px] font-bold transition ${
                            active
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900/70 text-slate-400 hover:text-white'
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active 3-Second Chunk of Comments */}
              <div className="px-2.5 py-1.5 max-h-28 overflow-y-auto space-y-1">
                {(commentListener?.recentComments || []).slice(-5).map((c) => (
                  <div key={c.id} className="text-[10px] leading-snug truncate">
                    <span className="font-semibold text-amber-300/90 mr-1">{c.author}:</span>
                    <span className="text-slate-200/90">{c.text}</span>
                  </div>
                ))}
                {(!commentListener?.recentComments ||
                  commentListener.recentComments.length === 0) && (
                  <div className="text-[10px] text-slate-500 italic">
                    {commentListener?.active
                      ? 'Aguardando novas mensagens ao vivo...'
                      : 'Cole o link da live/vídeo acima para ouvir o chat.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals (Fixed Overlay) */}
      <div className="fixed pointer-events-auto">
        <CinemaControlModal />
        <ParticipantsModal />
        <SettingsModal />
      </div>
    </div>
  );
};
