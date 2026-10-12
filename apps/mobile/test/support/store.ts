// A game store with fixed state for screen tests (MAINARC's pattern: set the state, render, look).
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { NEW_DRAFT } from '../../src/onboarding/flow.ts';
import type { Draft } from '../../src/onboarding/flow.ts';
import { GameProvider } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';

export function testStore(over: Partial<GameState> = {}): StoreApi<GameState> {
  return createStore<GameState>()((set) => ({
    phase: 'ready',
    cached: null,
    pending: [],
    view: null,
    status: 'idle',
    lastSyncedAt: null,
    notices: [],
    signInLost: false,
    error: null,
    draft: NEW_DRAFT,
    reveal: null,
    account: { kind: 'guest' },
    celebrations: [],
    art: null,
    vow: null,
    trainingNoticeSeen: true,
    checkinLater: null,
    checkinResultSeen: null,
    boot: jest.fn(async () => {}),
    enqueue: jest.fn(async () => {}),
    syncNow: jest.fn(async () => {}),
    editDraft: jest.fn((patch: Partial<Draft>) => set((s) => ({ draft: { ...s.draft, ...patch } }))),
    startCharacter: jest.fn(async () => ({ ok: true as const })),
    finishOnboarding: jest.fn(async () => {}),
    saveVow: jest.fn(async () => {}),
    dismissTrainingNotice: jest.fn(async () => {}),
    answerLater: jest.fn(),
    reopen: jest.fn(),
    dismissCheckinResult: jest.fn(async () => {}),
    saveWithGoogle: jest.fn(async () => ({ ok: true as const })),
    signInWithGoogle: jest.fn(async () => ({ ok: true as const, found: true })),
    deleteCharacter: jest.fn(async () => ({ ok: true as const })),
    startOver: jest.fn(async () => {}),
    dismissNotice: jest.fn(async () => {}),
    dismissCelebration: jest.fn(),
    timer: jest.fn(async () => null),
    saveTimer: jest.fn(async () => {}),
    stop: jest.fn(),
    ...over,
  }));
}

export const withStore = (store: StoreApi<GameState>, children: ReactNode) => createElement(GameProvider, { store, children });
