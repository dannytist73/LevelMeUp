import { goBack } from '../src/lib/navigation.ts';
import { Checkin } from '../src/screens/Checkin.tsx';

export default function CheckinRoute() {
  return <Checkin onDone={goBack} />;
}
