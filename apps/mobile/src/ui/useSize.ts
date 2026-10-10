import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export type Size = { width: number; height: number };

/** The view's laid-out size, for shapes drawn with react-native-svg (visual spec §5). Null until the first layout. */
export function useSize(): [Size | null, (event: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((old) => (old !== null && old.width === width && old.height === height ? old : { width, height }));
  }, []);
  return [size, onLayout];
}
