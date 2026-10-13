// Development only (M6c): a workout planned on the phone with the rules for any setup, shown in its log, so the screen
// can be checked on a device before a test character reaches a strength day. Nothing is sent.
import { EQUIPMENT_NAMES, LIBRARY, PROGRAM_STYLE_CHOICES } from '@levelmeup/content';
import { EQUIPMENT, PROGRAM_STYLES, ladderRungs, planWorkout, sessionCondition } from '@levelmeup/rules';
import type { Equipment, PlayerProfile, ProgramStyle } from '@levelmeup/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutLog } from '../../screens/quest/WorkoutLog.tsx';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Chip } from '../../ui/Chip.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { Body, Title } from '../../ui/Text.tsx';

const PLAYER: PlayerProfile = {
  classId: 'warrior', level: 5, goals: ['body'], minutesPerDay: 40, difficulty: 'steady', limitations: [], gentleStart: false,
  ownProgram: false, equipment: [], programStyle: 'none', stats: { strength: 7, vitality: 5, wisdom: 5, focus: 5 }, book: null,
};

export default function WorkoutPreview() {
  const insets = useSafeAreaInsets();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [style, setStyle] = useState<ProgramStyle>('none');
  const [rung, setRung] = useState(0);
  const [day, setDay] = useState(0);
  const template = ladderRungs(LIBRARY, 'workout')[rung]!;
  const moves = planWorkout(LIBRARY.training, template, { ...PLAYER, equipment, programStyle: style }, day);
  const condition = moves === null ? null : sessionCondition(template, moves, false);
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      <Title>Workout preview</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {EQUIPMENT.map((e) => (
          <Button key={e} label={`${equipment.includes(e) ? '• ' : ''}${EQUIPMENT_NAMES[e]}`} variant="secondary"
            onPress={() => setEquipment(equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e])} />
        ))}
        {PROGRAM_STYLES.map((s) => (
          <Button key={s} label={`${style === s ? '• ' : ''}${PROGRAM_STYLE_CHOICES[s].name}`} variant="secondary" onPress={() => setStyle(s)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Button label={`Rung ${rung}`} variant="secondary" onPress={() => setRung((rung + 1) % 6)} />
        <Button label={`Program day ${day + 1}`} variant="secondary" onPress={() => setDay(day + 1)} />
        <Chip label={`${template.minutes} min`} kind="outline" />
      </View>
      {condition?.kind === 'session'
        ? <WorkoutLog key={JSON.stringify(condition)} moves={condition.moves} disabled={false} onClaim={() => {}} />
        : <Body>No workout fits this setup.</Body>}
    </ScreenScroll>
  );
}
