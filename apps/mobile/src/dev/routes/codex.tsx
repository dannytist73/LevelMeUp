// Development only (M17): the Codex full (200 made-up lessons) in a store of its own, to scroll it on a device. Taking a
// lesson out changes only this preview.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { CODEX_MAX, toggled } from '../../reading/codex.ts';
import type { CodexEntry } from '../../reading/codex.ts';
import { Codex } from '../../screens/Codex.tsx';
import { GameProvider } from '../../state/store.ts';
import type { GameState } from '../../state/store.ts';

export default function CodexPreview() {
  const store = useMemo(() => {
    const codex: CodexEntry[] = Array.from({ length: CODEX_MAX }, (_, i) => ({
      articleId: `preview-${i}`, title: `Sample reading ${i + 1}`, keptAt: CODEX_MAX - i,
      lesson: i % 3 === 0 ? `Lesson ${i + 1}: a small step done today beats a large one planned for someday.` : `Lesson ${i + 1}: rest is part of the training.`,
    }));
    return createStore<Pick<GameState, 'codex' | 'toggleKeep'>>()((set, get) => ({
      codex,
      toggleKeep: async (entry: CodexEntry) => set({ codex: toggled(get().codex, entry) }),
    })) as unknown as StoreApi<GameState>;
  }, []);
  return (
    <GameProvider store={store}>
      <Codex onBack={() => router.back()} />
    </GameProvider>
  );
}
