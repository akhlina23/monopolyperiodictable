import React, { useCallback, useEffect, useState } from 'react';
import { GameWorkspace } from './components/GameWorkspace';
import { HomeScreen, SavedSessionSummary } from './components/HomeScreen';
import { loadLocalGame } from './storage/indexedDB';
import { GameState } from './types/game';

function extractSessionSummary(state: GameState | null): SavedSessionSummary | null {
  if (!state || !Array.isArray(state.teams) || state.teams.length < 2 || state.phase === 'GAME_OVER') {
    return null;
  }
  const activeTeam = state.teams[state.activeTeamIndex] ?? state.teams[0];
  return {
    activeTeamName: activeTeam?.name || 'Tim Hidrogen',
    teamCount: state.teams.length,
    updatedAt: state.updatedAt || Date.now(),
  };
}

export function App() {
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [workspaceIntent, setWorkspaceIntent] = useState<'resume' | 'new-game' | 'ptable' | null>('resume');
  const [savedSession, setSavedSession] = useState<SavedSessionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLocalGame()
      .then((saved) => {
        if (cancelled) return;
        setSavedSession(extractSessionSummary(saved));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const enterWorkspace = useCallback((intent: 'resume' | 'new-game' | 'ptable') => {
    setWorkspaceIntent(intent);
    setView('workspace');
  }, []);

  const handleBackToHome = useCallback(() => {
    setView('home');
  }, []);

  const handleInitialActionHandled = useCallback(() => {
    setWorkspaceIntent(null);
  }, []);

  const handleActiveGameSaved = useCallback((state: GameState) => {
    setSavedSession(extractSessionSummary(state));
  }, []);

  if (view === 'home') {
    return (
      <HomeScreen
        savedSession={savedSession}
        onPlay={() => enterWorkspace('resume')}
        onNewGame={() => enterWorkspace('new-game')}
        onOpenResearchLab={() => enterWorkspace('ptable')}
      />
    );
  }

  return (
    <GameWorkspace
      onBackToHome={handleBackToHome}
      initialAction={workspaceIntent}
      onInitialActionHandled={handleInitialActionHandled}
      onActiveGameSaved={handleActiveGameSaved}
    />
  );
}

export default App;
