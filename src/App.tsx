import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { LobbyScreen } from './components/ui/LobbyScreen';
import { GameWorld } from './components/world/GameWorld';
import { HUD } from './components/ui/HUD';

export const App: React.FC = () => {
  const inGame = useGameStore((s) => s.inGame);
  const initSocket = useGameStore((s) => s.initSocket);

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070913]">
      {!inGame ? (
        <LobbyScreen />
      ) : (
        <>
          <GameWorld />
          <HUD />
        </>
      )}
    </div>
  );
};

export default App;
