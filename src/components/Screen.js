import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Tarjeta centrada con ancho máximo tipo celular, con entrada suave
export default function Screen({ children, center = false }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={[styles.wrap, center && styles.middle]}>
      <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  wrap: { flexGrow: 1, padding: 16, alignItems: 'center' },
  middle: { justifyContent: 'center' },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 16, padding: 24, elevation: 3 },
});
