// A game store with fixed state for screen tests (MAINARC's pattern: set the state, render, look).
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { GameProvider } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';

export function testStore(over: Partial<GameState> = {}): StoreApi<GameState> {
  return createStore<GameState>()(() => ({
    phase: 'ready',
    cached: null,
    pending: [],
    view: null,
    status: 'idle',
    lastSyncedAt: null,
    notices: [],
    error: null,
    boot: jest.fn(async () => {}),
    enqueue: jest.fn(async () => {}),
    syncNow: jest.fn(async () => {}),
    startTestCharacter: jest.fn(async () => ({ ok: true as const, source: 'template' as const })),
    deleteTestCharacter: jest.fn(async () => ({ ok: true as const })),
    dismissNotice: jest.fn(),
    stop: jest.fn(),
    ...over,
  }));
}

export const withStore = (store: StoreApi<GameState>, children: ReactNode) => createElement(GameProvider, { store, children });
