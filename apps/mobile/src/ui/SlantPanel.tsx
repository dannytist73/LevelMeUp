// A panel with one edge cut on a slant (visual spec §1.3, §5): the current action's panel, the halftone header. The
// shape is drawn with react-native-svg once the panel knows its size; `offset` adds the 6 px vermilion panel behind it.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { colors, space } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

export type Edge = 'top' | 'bottom';

/** The panel's outline: `top` lowers the top-left corner by `depth`; `bottom` raises the bottom-right corner. */
export function slantPoints(edge: Edge, depth: number, width: number, height: number): string {
  const d = Math.min(depth, height / 2);
  return edge === 'top' ? `0,${d} ${width},0 ${width},${height} 0,${height}` : `0,0 ${width},0 ${width},${height - d} 0,${height}`;
}

export type SlantPanelProps = {
  children: ReactNode;
  edge?: Edge;
  /** How far the edge is cut, 8–18 px on the boards. */
  depth?: number;
  fill?: string;
  offset?: boolean;
  /** Padding of the content inside the panel. */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function SlantPanel({ children, edge = 'top', depth = 18, fill = colors.paper, offset = false, contentStyle, style }: SlantPanelProps) {
  const [size, onLayout] = useSize();
  const shift = offset ? space.offset : 0;
  return (
    <View testID="slant-panel" onLayout={onLayout} style={style}>
      {size !== null && (
        <Svg width={size.width} height={size.height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          {offset && (
            <Polygon
              testID="slant-offset"
              points={slantPoints(edge, depth, size.width - shift, size.height - shift)}
              fill={colors.vermilion}
              translateX={shift}
              translateY={shift}
            />
          )}
          <Polygon testID="slant-fill" points={slantPoints(edge, depth, size.width - shift, size.height - shift)} fill={fill} />
        </Svg>
      )}
      <View style={[{ marginRight: shift, marginBottom: shift, paddingTop: edge === 'top' ? depth + 8 : 0 }, contentStyle]}>{children}</View>
    </View>
  );
}
