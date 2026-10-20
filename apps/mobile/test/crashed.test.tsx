import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CRASH_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, usePathname } from 'expo-router';
import { Crashed, ScreenCrashed } from '../src/screens/Crashed.tsx';

jest.mock('expo-router', () => ({
  router: { canDismiss: jest.fn(() => true), dismissAll: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => '/quest/3'),
}));

const quiet = () => jest.spyOn(console, 'error').mockImplementation(() => {});

describe('a screen that failed (audit 2026-10-15)', () => {
  it('says so plainly, keeps the error in the log, and tries the screen again', async () => {
    const error = quiet();
    try {
      const retry = jest.fn(async () => {});
      const boom = new Error('boom');
      await render(<Crashed error={boom} retry={retry} />);
      expect(screen.getByLabelText(`System: ${CRASH_TEXT.line}`)).toBeTruthy();
      expect(error).toHaveBeenCalledWith('LevelMeUp: a screen failed', boom);
      await fireEvent.press(screen.getByRole('button', { name: CRASH_TEXT.retry }));
      expect(retry).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
    }
  });

  it('a failing screen offers Go to Today, which closes the screens above the tabs (premium pass A5)', async () => {
    const error = quiet();
    try {
      await render(<ScreenCrashed error={new Error('boom')} retry={jest.fn(async () => {})} />);
      await fireEvent.press(screen.getByRole('button', { name: CRASH_TEXT.today }));
      expect(router.dismissAll).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith('/');
    } finally {
      error.mockRestore();
    }
  });

  it('Today itself failing offers only Try again (premium pass A5)', async () => {
    const error = quiet();
    (usePathname as jest.Mock).mockReturnValueOnce('/');
    try {
      await render(<ScreenCrashed error={new Error('boom')} retry={jest.fn(async () => {})} />);
      expect(screen.queryByRole('button', { name: CRASH_TEXT.today })).toBeNull();
      expect(screen.getByRole('button', { name: CRASH_TEXT.retry })).toBeTruthy();
    } finally {
      error.mockRestore();
    }
  });

  it('every screen has its own boundary, so a failure leaves the app standing around it (premium pass A5)', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== 'dev') walk(path);
        } else if (name.endsWith('.tsx') && !name.startsWith('_layout') && name !== 'auth-callback.tsx') {
          files.push(path);
        }
      }
    };
    walk(join(__dirname, '..', 'app'));
    expect(files.length).toBeGreaterThan(30);
    const missing = files.filter((f) => !readFileSync(f, 'utf8').includes('export { ScreenCrashed as ErrorBoundary }'));
    expect(missing).toEqual([]);
  });
});
