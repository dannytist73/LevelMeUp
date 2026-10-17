// Simple stroke icons from the boards (24 × 24, 2 px stroke). Decorative: the text next to them carries the meaning.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens.ts';

export type IconName =
  | 'settings' | 'flame' | 'shield' | 'sun' | 'user' | 'calendar' | 'chevronLeft' | 'chevronRight'
  // M10c: rows that open in place, the portrait's switch, a set done.
  | 'chevronDown' | 'chevronUp' | 'switch' | 'check'
  // M11: the Story Deck's close, arrows, keep and share.
  | 'close' | 'arrowLeft' | 'arrowRight' | 'bookmark' | 'share'
  // M12: the Library tab, offline and failed states, the reminder offer.
  | 'book' | 'cloudOff' | 'alert' | 'bell';

const GEAR =
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

function shapes(name: IconName) {
  switch (name) {
    case 'settings':
      return [<Circle key="c" cx="12" cy="12" r="3" />, <Path key="p" d={GEAR} />];
    case 'flame':
      return [<Path key="p" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />];
    case 'shield':
      return [<Path key="p" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />];
    case 'sun':
      return [
        <Circle key="c" cx="12" cy="12" r="4" />,
        <Path key="p" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />,
      ];
    case 'user':
      return [<Path key="p" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />, <Circle key="c" cx="12" cy="7" r="4" />];
    case 'calendar':
      return [<Rect key="r" x="3" y="4" width="18" height="18" rx="2" />, <Path key="p" d="M16 2v4M8 2v4M3 10h18" />];
    case 'chevronLeft':
      return [<Path key="p" d="M15 18l-6-6 6-6" />];
    case 'chevronRight':
      return [<Path key="p" d="M9 18l6-6-6-6" />];
    case 'chevronDown':
      return [<Path key="p" d="M6 9l6 6 6-6" />];
    case 'chevronUp':
      return [<Path key="p" d="M18 15l-6-6-6 6" />];
    case 'switch':
      return [<Path key="p" d="M4 8h13l-3-3M20 16H7l3 3" />];
    case 'check':
      return [<Path key="p" d="M5 12l5 5 9-10" />];
    case 'close':
      return [<Path key="p" d="M18 6L6 18M6 6l12 12" />];
    case 'arrowLeft':
      return [<Path key="p" d="M19 12H5M12 19l-7-7 7-7" />];
    case 'arrowRight':
      return [<Path key="p" d="M5 12h14M12 5l7 7-7 7" />];
    case 'bookmark':
      return [<Path key="p" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />];
    case 'share':
      return [<Path key="p" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />];
    case 'book':
      return [<Path key="l" d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />, <Path key="r" d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />];
    case 'cloudOff':
      return [<Path key="x" d="M2 2l20 20" />, <Path key="a" d="M5.8 5.8A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.3-.2" />, <Path key="b" d="M21.5 16.5A4.5 4.5 0 0 0 17 10h-1.8A7 7 0 0 0 10 5.1" />];
    case 'alert':
      return [<Circle key="c" cx="12" cy="12" r="10" />, <Path key="p" d="M12 8v4M12 16h.01" />];
    case 'bell':
      return [<Path key="b" d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />, <Path key="c" d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />];
  }
}

export function Icon({ name, size = 22, color = colors.chalk }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg
      testID={`icon-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shapes(name)}
    </Svg>
  );
}
