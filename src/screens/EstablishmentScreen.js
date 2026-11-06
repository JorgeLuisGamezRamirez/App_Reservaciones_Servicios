import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getEstablishment, getAvailableSlots, createReservation, addDays, formatDate, formatTime, todayString } from '../services/api';
import ShakeError from '../components/ShakeError';
import Chip from '../components/Chip';
import AnimatedButton from '../components/AnimatedButton';
import { colors } from '../theme';

const DATE_OPTIONS = [0, 1, 2, 3, 7, 14];

export default function EstablishmentScreen({ route }) {
  const { state } = useAuth();
  const { id } = route.params;
  const [est, setEst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [service, setService] = useState(null);
  const [date, setDate] = useState(todayString());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEstablishment(id)
      .then(setEst)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!service) return;
    setSelected(null);
    setError('');
    setSuccess('');
    setSlotsLoading(true);
    getAvailableSlots(id, service.id, date)
      .then(setSlots)
      .catch((e) => {
        setSlots([]);
        setError(e.message);
      })
      .finally(() => setSlotsLoading(false));
  }, [service, date, id]);

  async function confirm() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createReservation({ userId: state.user.id, establishmentId: id, serviceId: service.id, date, start: selected });
      setSuccess('¡Listo! Tu reservación quedó pendiente de confirmación.');
      setSelected(null);
      setSlots(await getAvailableSlots(id, service.id, date));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;
  if (!est) return <View style={styles.container}><ShakeError message={error} /></View>;

  const dateOptions = DATE_OPTIONS.map((n) => ({
    value: addDays(n),
    label: n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : formatDate(addDays(n)),
  }));

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <View style={[styles.banner, { backgroundColor: est.color }]}>
        <Text style={styles.bannerIcon}>{est.icon}</Text>
      </View>
      <Text style={styles.name}>{est.name}</Text>
      <Text style={styles.meta}>{est.category} · ★ {est.rating} · 📍 {est.address}</Text>
      <Text style={styles.meta}>🕒 Atendemos de {formatTime(est.open)} a {formatTime(est.close)}</Text>

      <Text style={styles.section}>1. Elige un servicio</Text>
      {est.services.map((s) => {
        const sel = service?.id === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => setService(s)}
            style={({ pressed }) => [styles.service, sel && styles.serviceSel, pressed && styles.pressed]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.price}>${s.price}</Text>
            </View>
            <Text style={styles.meta}>{s.description}</Text>
            <Text style={styles.meta}>⏱ {s.duration} min</Text>
          </Pressable>
        );
      })}

      {service ? (
        <>
          <Text style={styles.section}>2. Elige el día</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dateOptions.map((o) => (
              <Chip key={o.value} label={o.label} selected={date === o.value} onPress={() => setDate(o.value)} />
            ))}
          </ScrollView>

          <Text style={styles.section}>3. Elige la hora</Text>
          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : slots.length === 0 ? (
            <Text style={styles.meta}>😔 No hay horarios libres para este día.</Text>
          ) : (
            <View style={styles.chips}>
              {slots.map((start) => (
                <Chip key={start} label={formatTime(start)} selected={selected === start} onPress={() => setSelected(start)} />
              ))}
            </View>
          )}

          {selected !== null ? (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
              <Text style={styles.summaryLine}>✨ {service.name}</Text>
              <Text style={styles.summaryLine}>📅 {formatDate(date)} · 🕒 {formatTime(selected)}</Text>
              <Text style={styles.summaryLine}>💲 ${service.price} MXN · ⏱ {service.duration} min</Text>
              <AnimatedButton style={[styles.button, saving && styles.disabled]} disabled={saving} onPress={confirm}>
                <Text style={styles.buttonText}>{saving ? 'Reservando…' : 'Confirmar reservación'}</Text>
              </AnimatedButton>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.meta}>Selecciona un servicio para ver los horarios.</Text>
      )}

      <ShakeError message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, width: '100%', maxWidth: 520, alignSelf: 'center', paddingBottom: 40 },
  loader: { marginTop: 40 },
  banner: { height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bannerIcon: { fontSize: 56 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 },
  service: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', elevation: 2 },
  serviceSel: { borderColor: colors.primary },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  price: { color: colors.success, fontWeight: '800', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  summary: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 20, elevation: 3 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  summaryLine: { color: colors.text, fontSize: 15, marginBottom: 4 },
  button: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.6 },
  success: { color: colors.success, textAlign: 'center', marginTop: 12, fontWeight: '700' },
});
