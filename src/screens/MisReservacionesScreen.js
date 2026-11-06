import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  getReservations,
  cancelReservation,
  getNotifications,
  markNotificationsRead,
  formatDate,
  formatTime,
} from '../services/api';
import ShakeError from '../components/ShakeError';
import Chip from '../components/Chip';
import StatusBadge from '../components/StatusBadge';
import AnimatedButton from '../components/AnimatedButton';
import { colors } from '../theme';

const ACTIVE = ['pendiente', 'confirmada'];
const POLL_MS = 15000;

export default function MisReservacionesScreen() {
  const { state } = useAuth();
  const userId = state.user.id;
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState([]);
  const [alert, setAlert] = useState('');
  const [tab, setTab] = useState('proximas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const seenIds = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const [res, notifs] = await Promise.all([getReservations(userId), getNotifications(userId)]);
      setItems(res);
      setNotes(notifs);

      // Primera carga: marca como vistas las notificaciones existentes
      if (seenIds.current === null) {
        seenIds.current = new Set(notifs.map((n) => n.id));
      } else {
        const fresh = notifs.filter((n) => !seenIds.current.has(n.id));
        if (fresh.length > 0 && silent) {
          setAlert(fresh[0].message);
        }
        fresh.forEach((n) => seenIds.current.add(n.id));
      }

      setUnread(notifs.filter((n) => !n.read).map((n) => n.id));
      if (notifs.some((n) => !n.read)) {
        await markNotificationsRead(userId);
      }
      setError('');
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Recarga cada vez que la pantalla vuelve a mostrarse
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Revisa cambios cada 15 segundos mientras la pantalla está abierta
  useEffect(() => {
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // El aviso desaparece solo después de unos segundos
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(''), 6000);
    return () => clearTimeout(t);
  }, [alert]);

  async function cancel(id) {
    setError('');
    setSuccess('');
    try {
      await cancelReservation(id);
      setSuccess('Cita cancelada. El horario quedó libre.');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;

  const upcoming = items.filter((r) => ACTIVE.includes(r.status));
  const history = items.filter((r) => !ACTIVE.includes(r.status));
  const list = tab === 'proximas' ? upcoming : history;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      {alert ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>🔔 {alert}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>🔔 Notificaciones</Text>
      {notes.length === 0 ? <Text style={styles.meta}>Sin notificaciones por ahora</Text> : null}
      {notes.slice(0, 5).map((n) => (
        <View key={n.id} style={[styles.note, unread.includes(n.id) && styles.noteNew]}>
          {unread.includes(n.id) ? <Text style={styles.newTag}>NUEVO</Text> : null}
          <Text style={styles.noteText}>{n.message}</Text>
        </View>
      ))}

      <Text style={styles.section}>📋 Mis citas</Text>
      <View style={styles.tabs}>
        <Chip label={`Próximas (${upcoming.length})`} selected={tab === 'proximas'} onPress={() => setTab('proximas')} />
        <Chip label={`Historial (${history.length})`} selected={tab === 'historial'} onPress={() => setTab('historial')} />
      </View>

      <ShakeError message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {list.length === 0 ? (
        <Text style={styles.empty}>{tab === 'proximas' ? '📭 No tienes citas próximas' : '🗂 Aún no tienes historial'}</Text>
      ) : null}

      {list.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.establishmentName}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>{item.serviceName} · ${item.price} MXN</Text>
          <Text style={styles.meta}>📅 {formatDate(item.date)} · 🕒 {formatTime(item.start)}</Text>
          {ACTIVE.includes(item.status) && !item.canCancelClient ? (
            <Text style={styles.hint}>Ya no se puede cancelar en línea (faltan menos de 2 horas).</Text>
          ) : null}
          {item.canCancelClient ? (
            <AnimatedButton style={styles.cancelBtn} onPress={() => cancel(item.id)}>
              <Text style={styles.cancelText}>Cancelar cita</Text>
            </AnimatedButton>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 40 },
  loader: { marginTop: 40 },
  toast: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 4 },
  toastText: { color: '#fff', fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 8, marginBottom: 10 },
  meta: { color: colors.muted, marginTop: 3 },
  note: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
  noteNew: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  newTag: { color: colors.primary, fontWeight: '800', fontSize: 11, marginBottom: 2 },
  noteText: { color: colors.text },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24, fontSize: 16 },
  success: { color: colors.success, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: 8 },
  hint: { color: colors.warn, marginTop: 8, fontSize: 13 },
  cancelBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: colors.danger, fontWeight: '700' },
});
