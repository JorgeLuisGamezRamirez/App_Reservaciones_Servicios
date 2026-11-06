import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AnimatedButton from '../components/AnimatedButton';
import ShakeError from '../components/ShakeError';
import Chip from '../components/Chip';
import StatusBadge from '../components/StatusBadge';
import { colors } from '../theme';
import * as api from '../services/api';

const ICONS = ['💈', '🧖', '🦷', '🏋️', '💅', '🩺', '🍽️', '🔧', '🏥', '🐾'];
const EMPTY_SERVICE = { name: '', description: '', price: '', duration: '' };
const TABS = [
  { key: 'resumen', label: '📊 Resumen' },
  { key: 'citas', label: '📅 Citas' },
  { key: 'servicios', label: '🧾 Servicios' },
  { key: 'negocio', label: '🏪 Negocio' },
];
const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'finalizada', label: 'Finalizadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

const Field = ({ style, ...rest }) => (
  <TextInput style={[styles.input, style]} placeholderTextColor={colors.muted} {...rest} />
);

export default function AdminHomeScreen() {
  const { state, logout } = useAuth();
  const ownerId = state.user.id;
  const [est, setEst] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [filter, setFilter] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regForm, setRegForm] = useState({ name: '', category: '', address: '', icon: '💈', open: '09:00', close: '18:00' });
  const [biz, setBiz] = useState({ name: '', category: '', address: '', icon: '💈', open: '', close: '' });
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [editingId, setEditingId] = useState(null);

  const refresh = useCallback(async () => {
    const e = await api.getMyEstablishment(ownerId);
    setEst(e);
    if (e) {
      const [res, st] = await Promise.all([api.getEstablishmentReservations(e.id), api.getAdminStats(e.id)]);
      setReservations(res);
      setStats(st);
      setBiz({
        name: e.name, category: e.category, address: e.address, icon: e.icon,
        open: api.formatTime(e.open), close: api.formatTime(e.close),
      });
    }
  }, [ownerId]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Ejecuta una acción, muestra el resultado y recarga los datos
  async function run(action, okMsg) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(okMsg);
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveService() {
    const ok = await run(
      () => (editingId ? api.updateService(est.id, editingId, serviceForm) : api.addService(est.id, serviceForm)),
      editingId ? 'Servicio actualizado' : 'Servicio agregado'
    );
    if (ok) {
      setEditingId(null);
      setServiceForm(EMPTY_SERVICE);
    }
  }

  function editService(s) {
    setEditingId(s.id);
    setServiceForm({ name: s.name, description: s.description || '', price: String(s.price), duration: String(s.duration) });
  }

  const todayList = reservations.filter((r) => r.date === api.todayString() && r.status !== 'cancelada');
  const filtered = filter === 'todas' ? reservations : reservations.filter((r) => r.status === filter);

  function renderReservation(r) {
    return (
      <View key={r.id} style={styles.item}>
        <View style={styles.rowBetween}>
          <Text style={styles.itemTitle}>{r.userName}</Text>
          <StatusBadge status={r.status} />
        </View>
        <Text style={styles.meta}>{r.serviceName} · ${r.price} MXN</Text>
        <Text style={styles.meta}>📅 {api.formatDate(r.date)} · 🕒 {api.formatTime(r.start)}</Text>
        <View style={styles.actions}>
          {r.canConfirm ? (
            <Chip label="Confirmar" onPress={() => run(() => api.setReservationStatus(r.id, 'confirmada', 'admin'), 'Cita confirmada')} />
          ) : null}
          {r.canFinish ? (
            <Chip label="Finalizar" onPress={() => run(() => api.setReservationStatus(r.id, 'finalizada', 'admin'), 'Cita finalizada')} />
          ) : null}
          {r.status === 'confirmada' && !r.canFinish ? (
            <Text style={styles.hint}>Podrás finalizarla cuando inicie la cita</Text>
          ) : null}
          {r.canCancelAdmin ? (
            <Chip label="Cancelar" danger onPress={() => run(() => api.setReservationStatus(r.id, 'cancelada', 'admin'), 'Cita cancelada')} />
          ) : null}
        </View>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;

  // Sin establecimiento: formulario de registro
  if (!est) {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Registra tu establecimiento 🏪</Text>
        <Text style={styles.meta}>Después podrás agregar servicios y configurar tu horario.</Text>
        <Field placeholder="Nombre del negocio" value={regForm.name} onChangeText={(v) => setRegForm({ ...regForm, name: v })} />
        <Field placeholder="Categoría (ej. Spa)" value={regForm.category} onChangeText={(v) => setRegForm({ ...regForm, category: v })} />
        <Field placeholder="Dirección o ciudad" value={regForm.address} onChangeText={(v) => setRegForm({ ...regForm, address: v })} />
        <Text style={styles.label}>Ícono</Text>
        <View style={styles.chips}>
          {ICONS.map((i) => <Chip key={i} label={i} selected={regForm.icon === i} onPress={() => setRegForm({ ...regForm, icon: i })} />)}
        </View>
        <View style={styles.row}>
          <Field style={styles.half} placeholder="Apertura HH:MM" value={regForm.open} onChangeText={(v) => setRegForm({ ...regForm, open: v })} />
          <Field style={styles.half} placeholder="Cierre HH:MM" value={regForm.close} onChangeText={(v) => setRegForm({ ...regForm, close: v })} />
        </View>
        <ShakeError message={error} />
        <AnimatedButton style={styles.primaryBtn} disabled={busy} onPress={() => run(() => api.registerEstablishment(ownerId, regForm), 'Establecimiento registrado')}>
          <Text style={styles.btnText}>{busy ? 'Guardando…' : 'Registrar establecimiento'}</Text>
        </AnimatedButton>
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <AnimatedButton style={styles.logout} onPress={logout}>
          <Text style={styles.btnText}>Cerrar sesión</Text>
        </AnimatedButton>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <View style={[styles.header, { backgroundColor: est.color }]}>
        <Text style={styles.headerIcon}>{est.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{est.name}</Text>
          <Text style={styles.headerMeta}>{est.category} · {est.address}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {TABS.map((t) => <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />)}
      </View>

      <ShakeError message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {tab === 'resumen' && stats ? (
        <>
          <View style={styles.statsGrid}>
            <Stat emoji="📅" value={stats.hoy} label="Citas hoy" />
            <Stat emoji="⏳" value={stats.pendientes} label="Pendientes" />
            <Stat emoji="✅" value={stats.confirmadas} label="Confirmadas" />
            <Stat emoji="🏁" value={stats.finalizadas} label="Finalizadas" />
            <Stat emoji="💰" value={`$${stats.ingresos}`} label="Ingresos" />
            <Stat emoji="👥" value={stats.clientes} label="Clientes" />
          </View>
          <Text style={styles.section}>Citas de hoy</Text>
          {todayList.length === 0 ? <Text style={styles.meta}>No hay citas para hoy 🌤</Text> : todayList.map(renderReservation)}
        </>
      ) : null}

      {tab === 'citas' ? (
        <>
          <View style={styles.chips}>
            {FILTERS.map((f) => <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
          </View>
          {filtered.length === 0 ? <Text style={styles.meta}>Sin citas en esta categoría</Text> : filtered.map(renderReservation)}
        </>
      ) : null}

      {tab === 'servicios' ? (
        <>
          <Text style={styles.section}>Servicios actuales</Text>
          {est.services.length === 0 ? <Text style={styles.meta}>Aún no tienes servicios</Text> : null}
          {est.services.map((s) => (
            <View key={s.id} style={styles.item}>
              <Text style={styles.itemTitle}>{s.name}</Text>
              <Text style={styles.meta}>${s.price} MXN · ⏱ {s.duration} min</Text>
              <View style={styles.actions}>
                <Chip label="Editar" onPress={() => editService(s)} />
                <Chip label="Eliminar" danger onPress={() => run(() => api.deleteService(est.id, s.id), 'Servicio eliminado')} />
              </View>
            </View>
          ))}

          <Text style={styles.section}>{editingId ? 'Editar servicio' : 'Nuevo servicio'}</Text>
          <Field placeholder="Nombre" value={serviceForm.name} onChangeText={(v) => setServiceForm({ ...serviceForm, name: v })} />
          <Field placeholder="Descripción" value={serviceForm.description} onChangeText={(v) => setServiceForm({ ...serviceForm, description: v })} />
          <View style={styles.row}>
            <Field style={styles.half} placeholder="Precio MXN" keyboardType="numeric" value={String(serviceForm.price)} onChangeText={(v) => setServiceForm({ ...serviceForm, price: v })} />
            <Field style={styles.half} placeholder="Duración (min)" keyboardType="numeric" value={String(serviceForm.duration)} onChangeText={(v) => setServiceForm({ ...serviceForm, duration: v })} />
          </View>
          <AnimatedButton style={styles.primaryBtn} disabled={busy} onPress={saveService}>
            <Text style={styles.btnText}>{editingId ? 'Guardar cambios' : 'Agregar servicio'}</Text>
          </AnimatedButton>
          {editingId ? <Chip label="Cancelar edición" onPress={() => { setEditingId(null); setServiceForm(EMPTY_SERVICE); }} /> : null}
        </>
      ) : null}

      {tab === 'negocio' ? (
        <>
          <Text style={styles.section}>Datos del establecimiento</Text>
          <Field placeholder="Nombre" value={biz.name} onChangeText={(v) => setBiz({ ...biz, name: v })} />
          <Field placeholder="Categoría" value={biz.category} onChangeText={(v) => setBiz({ ...biz, category: v })} />
          <Field placeholder="Dirección" value={biz.address} onChangeText={(v) => setBiz({ ...biz, address: v })} />
          <View style={styles.chips}>
            {ICONS.map((i) => <Chip key={i} label={i} selected={biz.icon === i} onPress={() => setBiz({ ...biz, icon: i })} />)}
          </View>
          <View style={styles.row}>
            <Field style={styles.half} placeholder="Apertura HH:MM" value={biz.open} onChangeText={(v) => setBiz({ ...biz, open: v })} />
            <Field style={styles.half} placeholder="Cierre HH:MM" value={biz.close} onChangeText={(v) => setBiz({ ...biz, close: v })} />
          </View>
          <AnimatedButton
            style={styles.primaryBtn}
            disabled={busy}
            onPress={() =>
              run(async () => {
                await api.updateEstablishment(est.id, biz);
                await api.updateHours(est.id, biz.open, biz.close);
              }, 'Datos y horario actualizados')
            }
          >
            <Text style={styles.btnText}>Guardar cambios</Text>
          </AnimatedButton>
        </>
      ) : null}

      <AnimatedButton style={styles.logout} onPress={logout}>
        <Text style={styles.btnText}>Cerrar sesión</Text>
      </AnimatedButton>
    </ScrollView>
  );
}

function Stat({ emoji, value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 40 },
  loader: { marginTop: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 8 },
  label: { color: colors.muted, fontWeight: '600', marginTop: 4, marginBottom: 6 },
  meta: { color: colors.muted, marginTop: 3 },
  header: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12 },
  headerIcon: { fontSize: 40, marginRight: 12 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerMeta: { color: '#e5e7eb', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stat: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  statLabel: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  hint: { color: colors.warn, fontSize: 12, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 6, marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  success: { color: colors.success, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  logout: { backgroundColor: colors.danger, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 24 },
});
