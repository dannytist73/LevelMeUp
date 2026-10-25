// Monster Week: the power a quest gives the battle, beside its XP. Candy, the battles' colour: filled when the quest hits
// the Grumble's weakness (double), outlined otherwise.
import { MONSTER_TEXT, fillText } from '@levelmeup/content';
import { Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';

export type Power = { n: number; weak: boolean };

/** What a screen reader hears for it, after the quest's own words. */
export const powerWords = (p: Power): string => fillText(p.weak ? MONSTER_TEXT.arena.questWeakLabel : MONSTER_TEXT.arena.questPowerLabel, { n: p.n });

export function PowerChip({ power }: { power: Power }) {
  const fg = power.weak ? colors.onAccent : colors.candy;
  return (
    <View testID={power.weak ? 'power-chip-weak' : 'power-chip'} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center', maxWidth: '100%', flexShrink: 1, paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill,
        backgroundColor: power.weak ? colors.candy : 'transparent', borderWidth: 1.5, borderColor: colors.candy,
      }}>
      <Icon name="bolt" size={14} color={fg} />
      <Text maxFontSizeMultiplier={2} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17, color: fg }}>
        {fillText(power.weak ? MONSTER_TEXT.arena.questWeak : MONSTER_TEXT.arena.questPower, { n: power.n })}
      </Text>
    </View>
  );
}
