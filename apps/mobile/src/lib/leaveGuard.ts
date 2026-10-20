// M17: Back on a screen with unsaved changes (the arrow, the gesture, Android's back button) asks first, in Android's own
// dialog: keep editing, or leave without saving. The screen says whether it has changes (`onDirty`); its route holds
// the guard, and Save's way out (`done`) leaves without asking.
import { SETTINGS_TEXT } from '@levelmeup/content';
import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

const T = SETTINGS_TEXT.leave;

export function useLeaveGuard() {
  const navigation = useNavigation();
  const dirty = useRef(false);
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (!dirty.current) return;
    e.preventDefault();
    Alert.alert(T.title, T.line, [
      { text: T.stay, style: 'cancel' },
      { text: T.leave, style: 'destructive', onPress: () => { dirty.current = false; navigation.dispatch(e.data.action); } },
    ]);
  }), [navigation]);
  return {
    onDirty: (changed: boolean): void => { dirty.current = changed; },
    /** Leaves after a save: nothing is lost, so nothing is asked. */
    done: (go: () => void) => (): void => { dirty.current = false; go(); },
  };
}
