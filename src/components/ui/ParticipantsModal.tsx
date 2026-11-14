import React from 'react';
import { Users, Crown, UserMinus, ArrowRightLeft, X, Armchair } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { SEAT_MAP } from '../../../shared/seats';
import { AvatarCustomizerPanel } from './AvatarCustomizerPanel';

export const ParticipantsModal: React.FC = () => {
  const activeModal = useGameStore((s) => s.activeModal);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const hostId = useGameStore((s) => s.hostId);
  const roomId = useGameStore((s) => s.roomId);
  const kickPlayer = useGameStore((s) => s.kickPlayer);
  const transferHost = useGameStore((s) => s.transferHost);
  const customization = useGameStore((s) => s.customization);
  const updateCustomization = useGameStore((s) => s.updateCustomization);

  if (activeModal !== 'participants' && activeModal !== 'avatar') return null;

  const isHost = myPlayerId === hostId;
  const playerList = Object.values(players).sort((a, b) => a.joinedAt - b.joinedAt);

  if (activeModal === 'avatar') {
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
            <h2 className="font-display text-sm font-bold text-white">Personalizar Avatar</h2>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 max-h-[78vh] overflow-y-auto">
            <AvatarCustomizerPanel
              customization={customization}
              onChange={updateCustomization}
              compact
            />
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
        className="w-full max-w-md rounded-2xl bg-slate-950/82 border border-white/12 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Slim Header */}
        <div className="px-4 py-3 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Participantes ({playerList.length}/16)
              </h2>
              <p className="text-[10px] text-slate-400">
                Sala <span className="font-mono text-amber-300">{roomId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Players List */}
        <div className="p-3.5 overflow-y-auto space-y-2">
          {playerList.map((p) => {
            const isMe = p.id === myPlayerId;
            const seatInfo = p.seatId ? SEAT_MAP[p.seatId] : null;

            return (
              <div
                key={p.id}
                className="px-3 py-2.5 rounded-xl bg-slate-900/65 border border-white/8 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center font-bold text-[10px] text-slate-950 shrink-0"
                    style={{ backgroundColor: p.customization.primaryColor }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          Você
                        </span>
                      )}
                      {p.id === hostId && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold">
                          <Crown className="w-2.5 h-2.5" /> Host
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {seatInfo ? (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <Armchair className="w-2.5 h-2.5" /> {seatInfo.label}
                        </span>
                      ) : (
                        <span>No lounge ({p.animation})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host Actions */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => transferHost(p.id)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[10px] font-semibold transition flex items-center gap-1"
                      title="Tornar Anfitrião"
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Host
                    </button>
                    <button
                      type="button"
                      onClick={() => kickPlayer(p.id)}
                      className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition"
                      title="Remover da Sala"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
