import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function Checkbox({ checked, onPress, disabled, accessibilityLabel, testID }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.box,
        {
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {checked ? <Text style={[styles.tick, { color: colors.onPrimary }]}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { fontSize: 14, fontWeight: '700', lineHeight: 16 },
});
