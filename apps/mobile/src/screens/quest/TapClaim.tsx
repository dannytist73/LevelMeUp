// Check-off quests (spec §3.6): one tap, on the honor system. M12: the button sits in the screen's fixed bar.
import { PLAY_TEXT } from '@levelmeup/content';
import { ClaimButton } from './ClaimBar.tsx';

export function TapClaim({ disabled, onClaim }: { disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  return <ClaimButton label={PLAY_TEXT.claim.tap} disabled={disabled} onPress={() => onClaim({})} />;
}
