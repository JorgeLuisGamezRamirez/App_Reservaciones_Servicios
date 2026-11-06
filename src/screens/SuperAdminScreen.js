import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AnimatedButton from '../components/AnimatedButton';
import ShakeError from '../components/ShakeError';
import Chip from '../components/Chip';
import StatusBadge from '../components/StatusBadge';
import { colors } from '../theme';
import { getOverview, setReservationStatus, formatDate, formatTime } from '../services/api';

const TABS = [
  { key: 'resumen', label: '📊 Resumen' },
  { key: 'negocios', label: '🏪 Negocios' },
  { key: 'citas', label: '📅 Citas' },
];
const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'finalizada', label: 'Finalizadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

function Stat({ emoji, value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SuperAdminScreen() {
  const { state, logout } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [filter, setFilter] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setData(await getOverview(state.user.id));
  }, [state.user.id]);

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  async function act(id, status, okMsg) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setReservationStatus(id, status, 'admin');
      setSuccess(okMsg);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;
  if (!data) return <View style={styles.container}><ShakeError message={error} /></View>;

  const list = filter === 'todas' ? data.reservations : data.reservations.filter((r) => r.status === filter);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Super administrador 🛡</Text>
      <Text style={styles.meta}>Vista global de todos los negocios</Text>

      <View style={styles.chips}>
        {TABS.map((t) => <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />)}
      </View>

      <ShakeError message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {tab === 'resumen' ? (
        <View style={styles.statsGrid}>
          <Stat emoji="🏪" value={data.totals.establecimientos} label="Negocios" />
          <Stat emoji="📅" value={data.totals.citas} label="Citas totales" />
          <Stat emoji="⏳" value={data.totals.activas} label="Activas" />
          <Stat emoji="👥" value={data.totals.clientes} label="Clientes" />
          <Stat emoji="💰" value={`$${data.totals.ingresos}`} label="Ingresos" />
        </View>
      ) : null}

      {tab === 'negocios' ? data.establishments.map((e) => (
        <View key={e.id} style={styles.item}>
          <View style={styles.row}>
            <Text style={styles.icon}>{e.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{e.name}</Text>
              <Text style={styles.meta}>{e.category} · {e.address}</Text>
              <Text style={styles.meta}>Administrador: {e.owner}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {e.services} servicios · ⏳ {e.pendientes} · ✅ {e.confirmadas} · 🏁 {e.finalizadas} · 💰 ${e.ingresos}
          </Text>
        </View>
      )) : null}

      {tab === 'citas' ? (
        <>
          <View style={styles.chips}>
            {FILTERS.map((f) => <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
          </View>
          {list.length === 0 ? <Text style={styles.meta}>Sin citas en esta categoría</Text> : null}
          {list.map((r) => (
            <View key={r.id} style={styles.item}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{r.establishmentName}</Text>
                <StatusBadge status={r.status} />
              </View>
              <Text style={styles.meta}>{r.userName} · {r.serviceName} · ${r.price} MXN</Text>
              <Text style={styles.meta}>📅 {formatDate(r.date)} · 🕒 {formatTime(r.start)}</Text>
              <View style={styles.actions}>
                {r.canConfirm ? (
                  <Chip label="Confirmar" onPress={() => act(r.id, 'confirmada', 'Cita confirmada')} />
                ) : null}
                {r.canFinish ? (
                  <Chip label="Finalizar" onPress={() => act(r.id, 'finalizada', 'Cita finalizada')} />
                ) : null}
                {r.canCancelAdmin ? (
                  <Chip label="Cancelar" danger onPress={() => act(r.id, 'cancelada', 'Cita cancelada')} />
                ) : null}
              </View>
            </View>
          ))}
        </>
      ) : null}

      <AnimatedButton style={[styles.logout, busy && styles.disabled]} disabled={busy} onPress={logout}>
        <Text style={styles.btnText}>Cerrar sesión</Text>
      </AnimatedButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 40 },
  loader: { marginTop: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stat: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  statLabel: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontSize: 32, marginRight: 12 },
  itemTitle: { fontWeight: '700', color: colors.text, fontSize: 15, flexShrink: 1, marginRight: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  success: { color: colors.success, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  logout: { backgroundColor: colors.danger, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
