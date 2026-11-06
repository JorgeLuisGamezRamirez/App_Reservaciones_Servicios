import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export default function Chip({ label, selected, onPress, danger }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, danger && styles.danger, pressed && styles.pressed]}
    >
      <Text style={[styles.text, selected && styles.textSelected, danger && styles.textDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  selected: { backgroundColor: colors.primary },
  danger: { borderColor: colors.danger },
  pressed: { transform: [{ scale: 0.96 }] },
  text: { color: colors.primary, fontWeight: '600' },
  textSelected: { color: '#fff' },
  textDanger: { color: colors.danger },
});
