import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

// Muestra el error y lo hace vibrar lateralmente al aparecer
export default function ShakeError({ message }) {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.sequence([
      Animated.timing(x, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={{ transform: [{ translateX: x }] }}>
      <Text style={styles.error}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: 'center', marginBottom: 8 },
});
