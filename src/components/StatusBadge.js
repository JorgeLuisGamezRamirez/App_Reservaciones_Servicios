import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export const STATUS = {
  pendiente: { label: 'Pendiente', color: colors.warn },
  confirmada: { label: 'Confirmada', color: colors.success },
  cancelada: { label: 'Cancelada', color: colors.danger },
  finalizada: { label: 'Finalizada', color: colors.muted },
};

export default function StatusBadge({ status }) {
  const st = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: st.color + '22' }]}>
      <Text style={[styles.text, { color: st.color }]}>{st.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  text: { fontWeight: '700', fontSize: 12 },
});
