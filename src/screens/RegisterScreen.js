import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import AnimatedButton from '../components/AnimatedButton';
import ShakeError from '../components/ShakeError';
import { colors } from '../theme';

export default function RegisterScreen() {
  const { state, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit() {
    if (!name || !email || !password) {
      alert('Completa todos los campos');
      return;
    }
    // Todas las cuentas nuevas son de cliente; el administrador no se registra desde la app
    register({ name, email, password, role: 'cliente' });
  }

  return (
    <Screen>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Regístrate como cliente para reservar servicios</Text>

      <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Correo" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />

      <ShakeError message={state.error} />

      <AnimatedButton style={[styles.button, state.loading && styles.disabled]} disabled={state.loading} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{state.loading ? '' : 'Crear cuenta'}</Text>
        {state.loading ? <ActivityIndicator color="#fff" style={styles.spinner} /> : null}
      </AnimatedButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.muted, marginBottom: 20, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16, color: colors.text },
  button: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  spinner: { marginLeft: 8 },
  disabled: { opacity: 0.6 },
});
