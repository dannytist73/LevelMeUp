import { CRASH_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Crashed } from '../src/screens/Crashed.tsx';

describe('a screen that failed (audit 2026-10-15)', () => {
  it('says so plainly, keeps the error in the log, and tries the screen again', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
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
});
