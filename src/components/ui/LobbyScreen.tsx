import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, Users, PlusCircle, LogIn, Tv, Radio, ShieldCheck } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { StylizedAvatar } from '../characters/StylizedAvatar';
import { AvatarCustomizerPanel } from './AvatarCustomizerPanel';
import { AnimationState } from '../../../shared/types';
import { soundFX } from '../../utils/soundEffects';

export const LobbyScreen: React.FC = () => {
  const customization = useGameStore((s) => s.customization);
  const updateCustomization = useGameStore((s) => s.updateCustomization);
  const publicRooms = useGameStore((s) => s.publicRooms);
  const connected = useGameStore((s) => s.connected);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const addToast = useGameStore((s) => s.addToast);

  const [previewAnim, setPreviewAnim] = useState<AnimationState>('idle');
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPublic, setNewRoomPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'create' | 'code'>('rooms');

  // Check if user opened an invite link (?room=SKY-XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedRoom = params.get('room');
    if (invitedRoom) {
      setJoinCode(invitedRoom.toUpperCase());
      setActiveTab('code');
    }
  }, []);

  const handleEnterRoom = async (opts: {
    roomId?: string;
    roomName?: string;
    createNew?: boolean;
    isPublic?: boolean;
  }) => {
    if (!customization.name.trim()) {
      addToast('Escolha um nome de exibição antes de entrar.', 'warning');
      return;
    }
    soundFX.playClick();
    setSubmitting(true);
    const res = await joinRoom(opts);
    setSubmitting(false);
    if (!res.ok && res.error) {
      addToast(res.error, 'error');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-y-auto bg-[#070913] text-slate-100 flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Atmospheric Radial Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-36 w-[520px] h-[520px] rounded-full bg-amber-500/12 blur-[130px]" />
        <div className="absolute top-1/4 -right-36 w-[560px] h-[560px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[620px] h-[420px] rounded-full bg-sky-500/10 blur-[130px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 max-w-7xl w-full mx-auto pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">
                SKYLOUNGE
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
                Penthouse 3D
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cobertura social multiplayer 3D com cinema gigante integrado em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {connected ? 'Servidor Online' : 'Conectando...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 max-w-7xl w-full mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: Live 3D Avatar Preview & Customizer (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-950/75 border border-white/12 backdrop-blur-xl shadow-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 3D Interactive Avatar Stage */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-amber-950/20 border border-white/10 overflow-hidden relative min-h-[300px]">
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full bg-slate-950/75 border border-white/10 text-[11px] font-semibold text-amber-300">
                Preview 3D
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {customization.name}
              </span>
            </div>

            <div className="w-full h-[290px] md:h-full">
              <Canvas camera={{ position: [0, 0.08, 2.75], fov: 44 }}>
                <ambientLight intensity={0.85} />
                <directionalLight position={[3, 5, 4]} intensity={1.4} color="#ffe3b8" />
                <pointLight position={[-2, 2, -2]} intensity={0.8} color="#8b5cf6" />
                <group position={[0, -0.82, 0]}>
                  <StylizedAvatar
                    customization={customization}
                    animation={previewAnim}
                    showLabel={false}
                    previewMode={true}
                  />
                </group>
              </Canvas>
            </div>

            {/* Quick Animation Preview Switcher */}
            <div className="p-2.5 bg-slate-950/80 border-t border-white/10 flex items-center justify-center gap-1.5 z-10">
              {(
                [
                  { id: 'idle', label: 'Idle' },
                  { id: 'wave', label: 'Acenar' },
                  { id: 'dance', label: 'Dançar' },
                  { id: 'sit', label: 'Sentar' },
                ] as { id: AnimationState; label: string }[]
              ).map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setPreviewAnim(anim.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    previewAnim === anim.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Customization Controls */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white mb-1">
                Personalize seu Avatar
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Sua aparência é sincronizada em tempo real com todos no lounge.
              </p>
              <AvatarCustomizerPanel
                customization={customization}
                onChange={updateCustomization}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Room Entry & Cinema Multiplayer Lobby (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-950/75 border border-white/12 backdrop-blur-xl shadow-2xl p-5 md:p-6 flex flex-col justify-between">
          <div>
            {/* Fast Entry Hero Button */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-violet-500/15 border border-amber-400/35 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Tv className="w-4 h-4" /> Cobertura Oficial Ativa
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Acesso Rápido
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                SkyLounge — Cobertura Principal
              </h3>
              <p className="text-xs text-slate-300 mb-3.5">
                Entre imediatamente no rooftop principal com seus amigos ou crie sua própria sala privada.
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleEnterRoom({ roomId: 'SKY-MAIN' })}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-bold text-sm shadow-lg shadow-amber-500/25 transition transform active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? 'Entrando no Lounge...' : 'Entrar no SkyLounge Principal →'}
              </button>
            </div>

            {/* Room Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('rooms');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'rooms'
                    ? 'bg-slate-800 text-amber-300 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Salas ({publicRooms.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('create');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'create'
                    ? 'bg-slate-800 text-amber-300 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Criar Sala
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('code');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'code'
                    ? 'bg-slate-800 text-amber-300 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Código
              </button>
            </div>

            {/* TAB 1: PUBLIC ROOMS LIST */}
            {activeTab === 'rooms' && (
              <div className="space-y-2.5 max-h-[210px] overflow-y-auto pr-1">
                {publicRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3 rounded-xl bg-slate-900/75 border border-white/10 hover:border-amber-400/40 transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {room.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300">
                          {room.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 truncate">
                        <Radio className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{room.currentMediaTitle}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg">
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleEnterRoom({ roomId: room.id })}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-400/40 text-xs font-bold transition"
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: CREATE NEW ROOM */}
            {activeTab === 'create' && (
              <div className="space-y-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Nome da Sala
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder={`Cobertura de ${customization.name}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Visibilidade da Sala</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewRoomPublic(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        newRoomPublic
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-950 border-white/10 text-slate-400'
                      }`}
                    >
                      Pública
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoomPublic(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        !newRoomPublic
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-950 border-white/10 text-slate-400'
                      }`}
                    >
                      Privada (Só Convite)
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    handleEnterRoom({
                      createNew: true,
                      roomName: newRoomName.trim() || `Lounge de ${customization.name}`,
                      isPublic: newRoomPublic,
                    })
                  }
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  Criar Sala & Tornar-se Anfitrião
                </button>
              </div>
            )}

            {/* TAB 3: JOIN BY CODE */}
            {activeTab === 'code' && (
              <div className="space-y-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Código da Sala
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Ex: SKY-MAIN ou SKY-4829"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-sm font-mono uppercase text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting || !joinCode.trim()}
                  onClick={() => handleEnterRoom({ roomId: joinCode.trim() })}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition"
                >
                  Entrar na Sala Informada
                </button>
              </div>
            )}
          </div>

          {/* Controls Summary Footer inside Card */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-slate-200">WASD</strong> Mover •{' '}
              <strong className="text-slate-200">Segurar Botão Direito</strong> Câmera •{' '}
              <strong className="text-slate-200">E</strong> Sentar / TV
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto pt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>SkyLounge 3D • WebGL + CSS3D Depth-Occluded Social Cinema</span>
        <span>YouTube • YouTube Live • Twitch • Kick</span>
      </footer>
    </div>
  );
};
