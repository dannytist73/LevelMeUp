// M13: Your look (Settings → LevelMeUp Plus): the colours and the portrait frame. Moonlight and no frame are free; the
// others are Plus (the Founder frame is the beta testers' own, never sold). A locked choice opens the offer instead of
// changing anything. A new colour redraws the whole app (app/_layout.tsx), which then comes back here.
import { PLUS_TEXT } from '@levelmeup/content';
import { View } from 'react-native';
import { FRAMES, frameAllowed, plusOf } from '../plus/plus.ts';
import type { FrameName } from '../plus/plus.ts';
import { useGame } from '../state/store.ts';
import { PALETTES, THEMES, isPlusTheme } from '../theme/palettes.ts';
import type { ThemeName } from '../theme/palettes.ts';
import { space } from '../theme/tokens.ts';
import { Chip } from '../ui/Chip.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Small } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';

/** A look's night, card and accent, side by side. */
function Swatches({ theme }: { theme: ThemeName }) {
  const p = PALETTES[theme];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[p.night, p.panel, p.accent, p.chalk].map((c, i) => (
        <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c, borderWidth: 1, borderColor: p.lineStrong }} />
      ))}
    </View>
  );
}

export type LookProps = { onBack: () => void; onPlus: () => void };

export function Look({ onBack, onPlus }: LookProps) {
  const view = useGame((s) => s.view);
  const plus = plusOf(view);
  const theme = useGame((s) => s.theme);
  const frame = useGame((s) => s.frame);
  const setTheme = useGame((s) => s.setTheme);
  const setFrame = useGame((s) => s.setFrame);
  const shownTheme: ThemeName = plus.active ? theme : 'moonlight';
  const founder = plus.active && plus.source === 'beta_founder';

  const pickTheme = (name: ThemeName) => {
    if (isPlusTheme(name) && !plus.active) return onPlus();
    if (name !== shownTheme) void setTheme(name);
  };
  const pickFrame = (name: FrameName) => {
    if (!frameAllowed(name, plus)) return onPlus();
    void setFrame(name);
  };
  const lock = (locked: boolean) => (locked ? <Chip label={PLUS_TEXT.look.plus} kind="outline" /> : undefined);

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <TopBar title={PLUS_TEXT.look.title} onBack={onBack} />
      {!plus.active && <Small>{PLUS_TEXT.look.lockedLine}</Small>}

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <SectionTitle title={PLUS_TEXT.look.themes} />
        {THEMES.map((name) => {
          const locked = isPlusTheme(name) && !plus.active;
          return (
            <OptionCard
              key={name}
              label={PLUS_TEXT.themes[name].name}
              detail={locked ? `${PLUS_TEXT.themes[name].line} ${PLUS_TEXT.look.plus}.` : PLUS_TEXT.themes[name].line}
              selected={shownTheme === name}
              onPress={() => pickTheme(name)}
              aside={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Swatches theme={name} />{lock(locked)}</View>}
            />
          );
        })}
      </View>

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <SectionTitle title={PLUS_TEXT.look.frames} />
        {FRAMES.filter((name) => name !== 'founder' || founder).map((name) => {
          const locked = !frameAllowed(name, plus);
          return (
            <OptionCard
              key={name}
              label={PLUS_TEXT.frames[name]}
              detail={name === 'founder' ? PLUS_TEXT.look.founderOnly : locked ? PLUS_TEXT.look.plus : undefined}
              selected={(frameAllowed(frame, plus) ? frame : 'none') === name}
              onPress={() => pickFrame(name)}
            />
          );
        })}
      </View>
    </ScreenScroll>
  );
}
