import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

// Botón que se encoge al presionarlo
export default function AnimatedButton({ onPress, disabled, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, friction: 5 }).start();
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
