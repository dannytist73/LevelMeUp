// The app is older than the System serves (M9b decision 5): what to do, and that nothing is lost. Today shows it above
// the day, Settings in its Sync section.
import { UPDATE_TEXT } from '@levelmeup/content';
import { NarrationBox } from '../ui/NarrationBox.tsx';

export function UpdateNeeded() {
  return <NarrationBox>{UPDATE_TEXT.line}</NarrationBox>;
}
