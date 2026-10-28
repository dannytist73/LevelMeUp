// The base app's few building blocks in Graphite: text, buttons, cards, option groups, a stepper, a field, a bar and
// the screen frame. 48 dp targets, labels that wrap instead of cutting, Android's ripple on every press.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons.tsx';
import type { BaseIcon } from './icons.tsx';
import { G, S, TYPE } from './theme.ts';
import type { TypeName } from './theme.ts';

export function T({ v = 'body', color = G.text, style, children, ...rest }: {
  v?: TypeName; color?: string; style?: StyleProp<TextStyle>; children: ReactNode; accessibilityRole?: 'header' | 'text'; testID?: string;
}) {
  const { maxScale, ...font } = TYPE[v];
  return (
    <Text maxFontSizeMultiplier={maxScale} style={[font, { color, fontVariant: ['tabular-nums'] }, style]} {...rest}>
      {children}
    </Text>
  );
}

/** A tappable surface with Android's ripple inside its corners. */
export function Press({ onPress, label, style, children, disabled, selected, testID }: {
  onPress: () => void; label: string; style?: StyleProp<ViewStyle>; children: ReactNode; disabled?: boolean; selected?: boolean; testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={selected === undefined ? { disabled: disabled === true } : { disabled: disabled === true, selected }}
      onPress={onPress} disabled={disabled} testID={testID}
      android_ripple={{ color: G.ripple, foreground: true }}
      style={({ pressed }) => [{ overflow: 'hidden', minHeight: S.touch, opacity: pressed ? 0.92 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', icon, disabled, style, testID }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'quiet'; icon?: BaseIcon; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const fg = disabled ? G.muted : kind === 'primary' ? G.onAccent : kind === 'secondary' ? G.text : G.accentText;
  const box: ViewStyle = kind === 'primary' && !disabled
    ? { backgroundColor: G.accent }
    : kind === 'secondary' || disabled ? { borderWidth: 1.5, borderColor: disabled ? G.line : G.edge } : {};
  return (
    <Press label={label} onPress={onPress} disabled={disabled} testID={testID}
      style={[{ minHeight: 52, borderRadius: S.control, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, box, style]}>
      {icon !== undefined && <Icon name={icon} size={20} color={fg} />}
      {/* Android reuses a text view across a disabled -> enabled change and can lose its words (seen 2026-10-28, and
          "Add a set" in 2026-10-15): a new view per state, and without an icon the label fills the button. */}
      <T key={disabled ? 'off' : 'on'} v="bodyStrong" color={fg} style={{ textAlign: 'center', flexShrink: 1, flexGrow: icon === undefined ? 1 : 0 }}>{label}</T>
    </Press>
  );
}

/** A round icon button (back, close, steppers): 48 dp, its name for screen readers. */
export function IconButton({ icon, label, onPress, filled, size = 48 }: { icon: BaseIcon; label: string; onPress: () => void; filled?: boolean; size?: number }) {
  return (
    <Press label={label} onPress={onPress}
      style={{ width: size, height: size, minHeight: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: filled ? 0 : 1.5, borderColor: G.edge, backgroundColor: filled ? G.raised : 'transparent' }}>
      <Icon name={icon} size={20} />
    </Press>
  );
}

export function Card({ children, style, hero }: { children: ReactNode; style?: StyleProp<ViewStyle>; hero?: boolean }) {
  return (
    <View style={[{ backgroundColor: G.surface, borderRadius: S.radius, padding: 16, gap: 10, borderWidth: hero ? 1.5 : 0, borderColor: G.accent }, style]}>
      {children}
    </View>
  );
}

/** One choice from a few: a grid of buttons, the chosen one outlined in the accent (and announced as selected). */
export function Options<K extends string | number>({ options, value, onChange, columns = 2, label }: {
  options: readonly { key: K; label: string; text?: string }[]; value: K | null; onChange: (k: K) => void; columns?: number; label: string;
}) {
  return (
    <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press key={String(o.key)} label={o.text === undefined ? o.label : `${o.label}. ${o.text}`} selected={on} onPress={() => onChange(o.key)}
            style={{ flexBasis: `${100 / columns - 3}%`, flexGrow: 1, borderRadius: S.control, borderWidth: on ? 2 : 1.5, borderColor: on ? G.accent : G.edge, backgroundColor: on ? G.raised : 'transparent', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', gap: 2 }}>
            <T v={o.text === undefined ? 'body' : 'bodyStrong'} color={on ? G.accentText : G.text} style={o.text === undefined ? { textAlign: 'center' } : undefined}>{o.label}</T>
            {o.text !== undefined && <T v="small" color={G.muted}>{o.text}</T>}
          </Press>
        );
      })}
    </View>
  );
}

/** Several choices: each a row that ticks on and off. */
export function Checks<K extends string>({ options, value, onChange }: {
  options: readonly { key: K; label: string }[]; value: readonly K[]; onChange: (next: K[]) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const on = value.includes(o.key);
        return (
          <Pressable key={o.key} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={o.label}
            android_ripple={{ color: G.ripple, foreground: true }}
            onPress={() => onChange(on ? value.filter((k) => k !== o.key) : [...value, o.key])}
            style={{ minHeight: 52, borderRadius: S.control, borderWidth: on ? 2 : 1.5, borderColor: on ? G.accent : G.edge, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, overflow: 'hidden' }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: on ? G.accent : G.edge, backgroundColor: on ? G.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={16} color={G.onAccent} />}
            </View>
            <T style={{ flex: 1 }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, value, onChange, placeholder, keyboard = 'default', testID, error }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; keyboard?: KeyboardTypeOptions; testID?: string; error?: string | null;
}) {
  return (
    <View style={{ gap: 6 }}>
      <T v="label" color={G.muted}>{label}</T>
      <TextInput
        accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={G.muted}
        keyboardType={keyboard} testID={testID} maxFontSizeMultiplier={2}
        style={{ minHeight: 52, borderRadius: S.control, borderWidth: 1.5, borderColor: error ? G.warn : G.edge, backgroundColor: G.raised, color: G.text, paddingHorizontal: 14, fontFamily: TYPE.body.fontFamily, fontSize: 16 }}
      />
      {error ? <T v="small" color={G.warn}>{error}</T> : null}
    </View>
  );
}

/** A filled bar for progress (decorative: the numbers beside it say the same). */
export function Bar({ value, max, height = 8 }: { value: number; max: number; height?: number }) {
  const share = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height, borderRadius: height, backgroundColor: G.raised, overflow: 'hidden' }}>
      <View style={{ width: `${share * 100}%`, height: '100%', backgroundColor: G.accent, borderRadius: height }} />
    </View>
  );
}

/** A screen: safe area, a scroll, the side gutter; an optional bar fixed at the bottom. */
export function Screen({ children, footer, scroll = true }: { children: ReactNode; footer?: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const body = <View style={{ gap: 16, paddingHorizontal: S.gutter, paddingTop: insets.top + 12, paddingBottom: 24 }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
      {footer !== undefined && (
        <View style={{ paddingHorizontal: S.gutter, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: G.bg, borderTopWidth: 1, borderTopColor: G.line, gap: 8 }}>
          {footer}
        </View>
      )}
    </View>
  );
}

/** A screen's top row: back (or close), the title, and something on the right. */
export function Header({ title, onBack, backIcon = 'back', right }: { title?: string; onBack?: () => void; backIcon?: 'back' | 'close'; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      {onBack !== undefined && <IconButton icon={backIcon} label={backIcon === 'close' ? 'Close' : 'Back'} onPress={onBack} />}
      {title !== undefined && <T v="heading" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>}
      {title === undefined && <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}
