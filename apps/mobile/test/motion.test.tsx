// M10a: the motion rule (visual spec §3; spec 2026-10-14-m10a-motion-design.md). Reanimated's Jest mock computes each
// animated style at each render from the shared values, and jumps every animation to its end: these tests check where
// each piece starts, its reduced-motion path and its accessibility, not frames. Starting values are checked on the
// pieces alone; on a screen, a re-render after mount would show the mock's end values, so screens check only that the
// motion is there.
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  FILL_MS, FLASH_MS, MOMENTS, REFILL_MS, RISE_MS, SLAM_MS, THUD_SETTLE_MS, WRAP_FILL_MS, countPlan, fillSegments, inkDrops,
} from '../src/ui/motion.ts';
import type { BarPoint, CountPlan } from '../src/ui/motion.ts';
import { useCountUp, useGrowth } from '../src/ui/useMotion.ts';

const at = (level: number, value: number, max = 130): BarPoint => ({ level, value, max });

describe('the motion numbers (M10a decisions 3–5)', () => {
  it('fills up within a level once, wraps once across a level, and never animates a drop', () => {
    expect(fillSegments(at(6, 26), at(6, 65))).toEqual([{ from: 0.2, to: 0.5 }]);
    expect(fillSegments(at(6, 117), at(7, 30, 150))).toEqual([{ from: 0.9, to: 1 }, { from: 0, to: 0.2 }]);
    expect(fillSegments(at(6, 117), at(8, 30, 150))).toEqual([{ from: 0.9, to: 1 }, { from: 0, to: 0.2 }]); // wraps once
    expect(fillSegments(at(6, 65), at(6, 26))).toEqual([]); // an undo
    expect(fillSegments(at(7, 10, 150), at(6, 120))).toEqual([]); // an undo across a level
    expect(fillSegments(at(6, 65), at(6, 65))).toEqual([]);
  });

  it('counts the level line in step with the bar: across a level, only the last part', () => {
    expect(countPlan(null, at(6, 65), 600)).toBeNull();
    expect(countPlan(at(6, 26), at(6, 65), 600)).toEqual({ from: 26, delay: 600, duration: FILL_MS });
    expect(countPlan(at(6, 117), at(7, 30, 150), 600)).toEqual({ from: 0, delay: 600 + WRAP_FILL_MS + FLASH_MS, duration: REFILL_MS });
    expect(countPlan(at(6, 65), at(6, 26), 600)).toBeNull();
  });

  it('splashes the same drops every time, all inside the radius', () => {
    const drops = inkDrops(12, 80);
    expect(drops).toHaveLength(12);
    expect(inkDrops(12, 80)).toEqual(drops);
    expect(inkDrops(16, 120)).toHaveLength(16);
    expect(drops.filter((d) => Math.hypot(d.dx, d.dy) > 80 + 1e-9 || Math.hypot(d.dx, d.dy) < 80 * 0.6)).toEqual([]);
    expect(drops.filter((d) => d.size < 3 || d.size > 9)).toEqual([]);
    expect(new Set(drops.map((d) => d.tone))).toEqual(new Set(['vermilion', 'seal', 'chalk']));
  });

  it('every moment is over in under two seconds (the Shadow\'s creep aside)', () => {
    const ends = [
      MOMENTS.cleared.bar + WRAP_FILL_MS + FLASH_MS + REFILL_MS, // the longest: a level crossed
      MOMENTS.cleared.rank + THUD_SETTLE_MS,
      MOMENTS.level.line + SLAM_MS,
      MOMENTS.level.portrait + RISE_MS,
      MOMENTS.achievement.rest + RISE_MS,
      MOMENTS.reveal.panel + SLAM_MS,
      MOMENTS.shadow.stamp + THUD_SETTLE_MS,
    ];
    expect(ends.filter((ms) => ms >= 2_000)).toEqual([]);
  });
});

function Growth({ value }: { value: number | null }) {
  return <Text>{`grew ${useGrowth(value)}`}</Text>;
}

function Count({ plan, to, reduce }: { plan: CountPlan | null; to: number; reduce?: boolean }) {
  return <Text>{`n ${useCountUp(plan, to, reduce)}`}</Text>;
}

describe('the motion hooks (M10a)', () => {
  it('counts only rises after the first value, so opening a screen never animates', async () => {
    const view = await render(<Growth value={null} />);
    await view.rerender(<Growth value={4} />);
    expect(screen.getByText('grew 0')).toBeTruthy();
    await view.rerender(<Growth value={5} />);
    expect(screen.getByText('grew 1')).toBeTruthy();
    await view.rerender(<Growth value={3} />);
    expect(screen.getByText('grew 1')).toBeTruthy();
    await view.rerender(<Growth value={4} />);
    expect(screen.getByText('grew 2')).toBeTruthy();
  });

  it('a count starts at its plan (the phone counts up from there); with reduced motion or no plan, the end at once', async () => {
    await render(<Count plan={{ from: 67, delay: 600, duration: FILL_MS }} to={87} />);
    expect(screen.getByText('n 67')).toBeTruthy();
    await render(<Count plan={{ from: 67, delay: 600, duration: FILL_MS }} to={87} reduce />);
    expect(screen.getByText('n 87')).toBeTruthy();
    await render(<Count plan={null} to={87} />);
    expect(screen.getByText('n 87')).toBeTruthy();
  });
});
