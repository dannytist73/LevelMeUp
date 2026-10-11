// Check-off quests (spec §3.6): one tap, on the honor system.
import { PLAY_TEXT } from '@levelmeup/content';
import { Button } from '../../ui/Button.tsx';

export function TapClaim({ disabled, onClaim }: { disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  return <Button label={PLAY_TEXT.claim.tap} variant="commitment" disabled={disabled} onPress={() => onClaim({})} />;
}
