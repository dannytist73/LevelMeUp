// The base app's stroke icons (24 × 24, 2 px). Decorative: the words beside them carry the meaning.
import Svg, { Circle, Path } from 'react-native-svg';
import { G } from './theme.ts';

export type BaseIcon =
  | 'today' | 'train' | 'read' | 'eat' | 'user' | 'plus' | 'minus' | 'check' | 'close' | 'back' | 'next' | 'swap' | 'alert' | 'clock' | 'trash';

function shapes(name: BaseIcon) {
  switch (name) {
    case 'today': return [<Circle key="c" cx="12" cy="12" r="4" />, <Path key="r" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />];
    case 'train': return [<Path key="b" d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />];
    case 'read': return [<Path key="b" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />];
    case 'eat': return [<Path key="f" d="M7 2v8a2 2 0 0 0 2 2v10M11 2v8a2 2 0 0 1-2 2M17 22V2c-2 1.5-3 4-3 7v4h3" />];
    case 'user': return [<Circle key="h" cx="12" cy="8" r="4" />, <Path key="b" d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />];
    case 'plus': return [<Path key="p" d="M12 5v14M5 12h14" />];
    case 'minus': return [<Path key="m" d="M5 12h14" />];
    case 'check': return [<Path key="c" d="M5 12.5l4.5 4.5L19 7.5" />];
    case 'close': return [<Path key="x" d="M6 6l12 12M18 6L6 18" />];
    case 'back': return [<Path key="b" d="M15 18l-6-6 6-6" />];
    case 'next': return [<Path key="n" d="M9 18l6-6-6-6" />];
    case 'swap': return [<Path key="s" d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />];
    case 'alert': return [<Path key="t" d="M12 3l10 18H2L12 3z" />, <Path key="l" d="M12 10v5M12 18h.01" />];
    case 'clock': return [<Circle key="c" cx="12" cy="12" r="9" />, <Path key="h" d="M12 7v5l3 2" />];
    case 'trash': return [<Path key="t" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />];
  }
}

export function Icon({ name, size = 22, color = G.text }: { name: BaseIcon; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shapes(name)}
    </Svg>
  );
}
