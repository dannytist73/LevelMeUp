// M13: the portrait's frames (Plus, and the beta testers' Founder frame), drawn over the painting's edge in the look's
// own colours, so they follow a Plus theme. Decoration only: the portrait's label already says who it is.
import { Circle, G, Line, Path, Rect } from 'react-native-svg';
import type { FrameName } from '../plus/plus.ts';
import { colors } from '../theme/tokens.ts';

type Size = { w: number; h: number };

/** An inner ring, inset from the edge. */
const Ring = ({ w, h, inset, color, width = 2 }: Size & { inset: number; color: string; width?: number }) => (
  <Rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx={18} fill="none" stroke={color} strokeWidth={width} />
);

function Moon({ w, h }: Size) {
  const cx = w / 2;
  return (
    <G testID="frame-moon">
      <Ring w={w} h={h} inset={8} color={colors.accent} />
      <Circle cx={cx} cy={8} r={11} fill={colors.night} stroke={colors.accent} strokeWidth={2} />
      <Path d={`M${cx + 3} ${1} a7 7 0 1 0 0 14 a5.5 5.5 0 1 1 0 -14z`} fill={colors.accentText} />
    </G>
  );
}

function Rune({ w, h }: Size) {
  // Short strokes along the edge, like runes on a band: 6 a side, 7 on top and bottom.
  const marks: [number, number, number, number][] = [];
  for (let i = 1; i <= 7; i++) {
    const x = (w * i) / 8;
    marks.push([x - 3, 4, x + 3, 12], [x + 3, h - 12, x - 3, h - 4]);
  }
  for (let i = 1; i <= 6; i++) {
    const y = (h * i) / 7;
    marks.push([4, y - 3, 12, y + 3], [w - 12, y + 3, w - 4, y - 3]);
  }
  return (
    <G testID="frame-rune">
      <Ring w={w} h={h} inset={14} color={colors.accent} width={1.5} />
      {marks.map(([x1, y1, x2, y2]) => <Line key={`${x1},${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.accentText} strokeWidth={2.5} strokeLinecap="round" />)}
    </G>
  );
}

function Crest({ w, h }: Size) {
  const cx = w / 2;
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + 22 * dy} L${x} ${y} L${x + 22 * dx} ${y}`;
  return (
    <G testID="frame-crest">
      <Path d={[corner(8, 8, 1, 1), corner(w - 8, 8, -1, 1), corner(8, h - 8, 1, -1), corner(w - 8, h - 8, -1, -1)].join(' ')}
        fill="none" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" />
      <Path d={`M${cx} 2 L${cx + 10} 12 L${cx} 22 L${cx - 10} 12 Z`} fill={colors.accent} stroke={colors.night} strokeWidth={2} />
    </G>
  );
}

function Founder({ w, h }: Size) {
  const cx = w / 2;
  const star = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 10 : 4.2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(12 + r * Math.sin(a)).toFixed(1)}`;
  });
  return (
    <G testID="frame-founder">
      <Ring w={w} h={h} inset={6} color={colors.accent} width={2.5} />
      <Ring w={w} h={h} inset={12} color={colors.accentText} width={1} />
      <Circle cx={cx} cy={12} r={13} fill={colors.night} stroke={colors.accent} strokeWidth={2} />
      <Path d={`M${star.join(' L')} Z`} fill={colors.accentText} />
    </G>
  );
}

export function PortraitFrame({ frame, w, h }: Size & { frame: FrameName }) {
  switch (frame) {
    case 'none': return null;
    case 'moon': return <Moon w={w} h={h} />;
    case 'rune': return <Rune w={w} h={h} />;
    case 'crest': return <Crest w={w} h={h} />;
    case 'founder': return <Founder w={w} h={h} />;
  }
}
