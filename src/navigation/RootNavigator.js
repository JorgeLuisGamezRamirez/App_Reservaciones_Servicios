import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClienteHomeScreen from '../screens/ClienteHomeScreen';
import EstablishmentScreen from '../screens/EstablishmentScreen';
import MisReservacionesScreen from '../screens/MisReservacionesScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import SuperAdminScreen from '../screens/SuperAdminScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { state } = useAuth();

  if (state.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!state.user) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} />
      </Stack.Navigator>
    );
  }

  if (state.user.role === 'superadmin') {
    return (
      <Stack.Navigator>
        <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} options={{ title: 'Super administrador' }} />
      </Stack.Navigator>
    );
  }

  if (state.user.role === 'admin') {
    return (
      <Stack.Navigator>
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Panel de administrador' }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="ClienteHome" component={ClienteHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Establecimiento" component={EstablishmentScreen} options={({ route }) => ({ title: route.params.name })} />
      <Stack.Screen name="MisReservaciones" component={MisReservacionesScreen} options={{ title: 'Mis citas' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
