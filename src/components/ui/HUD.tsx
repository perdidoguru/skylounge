import React from 'react';
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
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { SEAT_MAP } from '../../../shared/seats';
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

  const playerCount = Object.keys(players).length;
  const isHost = myPlayerId === hostId;
  const nearbySeat = nearbySeatId ? SEAT_MAP[nearbySeatId] : null;
  const currentSeat = mySeatId ? SEAT_MAP[mySeatId] : null;

  const handleCopyInvite = () => {
    soundFX.playClick();
    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        addToast(`Link de convite copiado (${roomId})!`, 'success');
      })
      .catch(() => {
        addToast(`Código da sala: ${roomId}`, 'info');
      });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 select-none">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: Room Badge, Invite Link & Now Playing Pill */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-white/12 backdrop-blur-xl shadow-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
              }`}
              title={connected ? 'Conectado em tempo real' : 'Reconectando...'}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs text-white tracking-wide">
                  SKYLOUNGE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 font-mono text-[10px] font-bold text-amber-300">
                  {roomId}
                </span>
                {isHost && (
                  <span className="text-[11px]" title="Você é o Anfitrião">
                    👑
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyInvite}
              className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-400/30 text-[11px] font-bold transition"
              title="Copiar link de convite da sala"
            >
              <Share2 className="w-3 h-3" /> Convidar
            </button>
          </div>

          {/* Now Playing Cinema Pill */}
          <button
            type="button"
            onClick={() => setActiveModal('tv')}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900/90 border border-white/12 hover:border-amber-400/40 backdrop-blur-xl shadow-lg transition max-w-xs"
          >
            <Tv className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1.5">
                <span>Cinema TV</span>
                {tvState.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                )}
              </div>
              <div className="text-xs font-semibold text-slate-100 truncate">
                {tvState.title}
              </div>
            </div>
          </button>

          {/* Autoplay Unmute Prompt Pill if Browser Muted Initial Video */}
          {tvAutoplayBlocked && (
            <button
              type="button"
              onClick={() => updateSettings({ tvMuted: false, tvVolume: 75 })}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg animate-bounce"
            >
              <Volume2 className="w-4 h-4" /> Ativar Áudio da TV
            </button>
          )}

          {/* Direct TV Interactive Mode Banner */}
          {tvInteractiveMode && (
            <button
              type="button"
              onClick={() => setTVInteractiveMode(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-violet-600 text-white font-bold text-xs shadow-lg border border-violet-300/40"
            >
              <MousePointerClick className="w-4 h-4" /> Modo Clique na TV Ativo (Clique para voltar ao 3D)
            </button>
          )}
        </div>

        {/* Top-Right: Quick Action Menu Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveModal('tv')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <Tv className="w-4 h-4" /> Controle da TV
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('avatar')}
            className="p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/12 text-slate-200 hover:text-amber-300 backdrop-blur-xl shadow-lg transition"
            title="Personalizar Avatar"
          >
            <User className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('participants')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/12 text-slate-200 hover:text-amber-300 backdrop-blur-xl shadow-lg text-xs font-bold transition"
            title="Participantes na Sala"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>{playerCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('settings')}
            className="p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/12 text-slate-200 hover:text-amber-300 backdrop-blur-xl shadow-lg transition"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('help')}
            className="p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-white/12 text-slate-200 hover:text-amber-300 backdrop-blur-xl shadow-lg transition"
            title="Controles e Ajuda"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={leaveRoom}
            className="p-2.5 rounded-2xl bg-slate-950/80 hover:bg-rose-950/90 border border-white/12 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 backdrop-blur-xl shadow-lg transition"
            title="Sair para o Lobby"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-20 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-xl text-xs font-semibold transition-all ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-400/40 text-amber-200'
                : t.type === 'error'
                ? 'bg-rose-950/90 border-rose-400/40 text-rose-200'
                : 'bg-slate-900/90 border-white/15 text-slate-100'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* CONTEXTUAL INTERACTION PROMPTS & BOTTOM EMOTE BAR */}
      <div className="flex flex-col items-center gap-3 mb-1">
        {/* Contextual Prompt: Nearby Seat, Currently Seated, or Near Giant TV */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          {currentSeat && (
            <button
              type="button"
              onClick={() => standUp()}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-amber-400/50 text-xs font-semibold text-white shadow-xl backdrop-blur-xl transition"
            >
              <Armchair className="w-4 h-4 text-amber-400" />
              <span>Sentado em: {currentSeat.label}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px]">
                [E] ou Espaço para Levantar
              </span>
            </button>
          )}

          {!currentSeat && nearbySeat && (
            <button
              type="button"
              onClick={() => sitOnSeat(nearbySeat.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-amber-400/60 text-xs font-semibold text-white shadow-xl backdrop-blur-xl transition animate-pulse"
            >
              <Armchair className="w-4 h-4 text-amber-400" />
              <span>Sentar em {nearbySeat.label}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px]">
                Tecla [E]
              </span>
            </button>
          )}

          {!currentSeat && !nearbySeat && nearTV && (
            <button
              type="button"
              onClick={() => setActiveModal('tv')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur-xl transition"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Interagir com a TV Gigante</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-300 font-bold text-[10px]">
                [E] ou [T]
              </span>
            </button>
          )}
        </div>

        {/* Bottom Center Emote Dock & Camera Hint */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-white/12 backdrop-blur-xl shadow-2xl">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="text-[10px] opacity-60 font-mono">[{item.key}]</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Multiplayer Chat Panel (Bottom-Left Fixed) */}
      <div className="fixed bottom-0 left-0 pointer-events-auto">
        <ChatPanel />
      </div>

      {/* Modals (Fixed Overlay) */}
      <div className="fixed pointer-events-auto">
        <CinemaControlModal />
        <ParticipantsModal />
        <SettingsModal />
      </div>
    </div>
  );
};
