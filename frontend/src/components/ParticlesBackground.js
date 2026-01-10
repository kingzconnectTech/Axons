import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const Particle = () => {
  const anim = React.useRef(new Animated.Value(0)).current;
  const randomDelay = Math.random() * 2000;
  const duration = Math.random() * 3000 + 4000;
  
  // Random static position
  const left = `${Math.random() * 100}%`;
  const top = `${Math.random() * 100}%`;
  const size = Math.random() * 4 + 2; // 2-6px

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(anim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30] // Float up 30px
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.6, 0.2]
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
        transform: [{ translateY }],
        opacity
      }}
    />
  );
};

const ParticlesBackground = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(25)].map((_, i) => (
        <Particle key={i} />
      ))}
    </View>
  );
};

export default ParticlesBackground;
