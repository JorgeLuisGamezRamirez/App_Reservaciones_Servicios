import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getEstablishments } from '../services/api';
import ShakeError from '../components/ShakeError';
import Chip from '../components/Chip';
import AnimatedButton from '../components/AnimatedButton';
import { colors } from '../theme';

export default function ClienteHomeScreen({ navigation }) {
  const { state, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');

  useEffect(() => {
    getEstablishments()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(items.map((e) => e.category)))], [items]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter((e) => {
    const matchQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.services.some((s) => s.name.toLowerCase().includes(q));
    const matchCategory = category === 'Todas' || e.category === category;
    return matchQuery && matchCategory;
  });

  const header = (
    <View>
      <Text style={styles.hello}>Hola, {state.user.name.split(' ')[0]} 👋</Text>
      <Text style={styles.sub}>¿Qué te gustaría reservar hoy?</Text>
      <TextInput
        style={styles.search}
        placeholder="Buscar servicio o lugar"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {categories.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      <ShakeError message={error} />
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <AnimatedButton style={[styles.footerBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('MisReservaciones')}>
        <Text style={styles.btnText}>📋 Mis citas</Text>
      </AnimatedButton>
      <AnimatedButton style={[styles.footerBtn, { backgroundColor: colors.danger }]} onPress={logout}>
        <Text style={styles.btnText}>Cerrar sesión</Text>
      </AnimatedButton>
    </View>
  );

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />;

  return (
    <FlatList
      style={styles.bg}
      contentContainerStyle={styles.container}
      data={filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={<Text style={styles.empty}>🔎 No encontramos resultados</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Establecimiento', { id: item.id, name: item.name })}
        >
          <View style={[styles.banner, { backgroundColor: item.color }]}>
            <Text style={styles.bannerIcon}>{item.icon}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.rating}>★ {item.rating}</Text>
            </View>
            <Text style={styles.meta}>{item.category} · 📍 {item.address}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.price}>Desde ${item.minPrice} MXN</Text>
              <Text style={styles.link}>{item.services.length} servicios →</Text>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  loader: { marginTop: 40 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: 14 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 16, color: colors.text, marginBottom: 12 },
  chipsRow: { marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 14, elevation: 3 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  banner: { height: 96, alignItems: 'center', justifyContent: 'center' },
  bannerIcon: { fontSize: 46 },
  body: { padding: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  rating: { color: colors.warn, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 4 },
  price: { color: colors.success, fontWeight: '700', marginTop: 8 },
  link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 24 },
  footerBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
