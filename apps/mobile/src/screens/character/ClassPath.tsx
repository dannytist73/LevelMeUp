// The class path on Character (board D4; M6d decision 9): the class's two abilities, when each unlocks, and whether it is
// ready now. Abilities whose screens come in a later update say so instead of pretending to work.
import { ABILITY_LINES, ABILITY_NAMES, CHARACTER_TEXT, CLASS_NAMES, fillText } from '@levelmeup/content';
import { View } from 'react-native';
import { abilityStatus, classAbilities, statusText } from '../../game/character.ts';
import type { Shown } from '../../game/project.ts';
import { colors } from '../../theme/tokens.ts';
import { Icon } from '../../ui/icons.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { SectionTitle } from '../../ui/SectionTitle.tsx';
import { Heading, Label, Small } from '../../ui/Text.tsx';

export function ClassPath({ view, dayNumber }: { view: Shown; dayNumber: number | null }) {
  const { classId } = view.profile;
  const { level, abilityLastUsed } = view.character;
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={fillText(CHARACTER_TEXT.path.title, { className: CLASS_NAMES[classId] })} />
      {classAbilities(classId).map((id) => {
        const status = abilityStatus(id, classId, level, abilityLastUsed[id] ?? null, dayNumber);
        return (
          <NightCard key={id} quiet={status.kind === 'locked'}>
            <View style={{ gap: 4 }}>
              <Heading>{ABILITY_NAMES[id]}</Heading>
              {/* M17 (design critique): a lock beside a locked ability's level, so it doesn't read as one already owned. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {status.kind === 'locked' && <Icon name="lock" size={16} color={colors.ash} />}
                <Label tone={status.kind === 'locked' ? 'ash' : 'accentText'} style={{ flexShrink: 1 }}>{statusText(status)}</Label>
              </View>
              <Small>{ABILITY_LINES[id]}</Small>
            </View>
          </NightCard>
        );
      })}
    </View>
  );
}
