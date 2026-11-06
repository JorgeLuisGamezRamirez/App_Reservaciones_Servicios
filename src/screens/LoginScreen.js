import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, Pressable } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import AnimatedButton from '../components/AnimatedButton';
import ShakeError from '../components/ShakeError';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const { state, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen center>
      <Text style={styles.title}>Reservaciones</Text>
      <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

      <TextInput style={styles.input} placeholder="Correo" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />

      <ShakeError message={state.error} />

      <AnimatedButton style={[styles.button, state.loading && styles.disabled]} disabled={state.loading} onPress={() => login(email, password)}>
        <Text style={styles.buttonText}>{state.loading ? '' : 'Iniciar sesión'}</Text>
        {state.loading ? <ActivityIndicator color="#fff" style={styles.spinner} /> : null}
      </AnimatedButton>

      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </Pressable>

      <Text style={styles.hint}>Prueba: cliente@demo.com o admin@demo.com · clave 123456</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: colors.text },
  subtitle: { textAlign: 'center', color: colors.muted, marginBottom: 24, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16, color: colors.text },
  button: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  spinner: { marginLeft: 8 },
  disabled: { opacity: 0.6 },
  link: { color: colors.primary, textAlign: 'center', marginTop: 18, fontWeight: '500' },
  hint: { color: colors.muted, textAlign: 'center', marginTop: 24, fontSize: 12 },
});
