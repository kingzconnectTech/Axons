import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

export default function AnimatedBorderButton({ 
  children, 
  containerStyle, 
  contentContainerStyle,
  colors = ['transparent', '#FFFFFF', 'transparent'], // Default "light" moving
  borderWidth = 2,
  borderRadius = 16,
  duration = 2000
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const theme = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    
    return () => animation.stop();
  }, [duration]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { borderRadius }, containerStyle]}>
      <Animated.View style={[styles.gradientContainer, { transform: [{ rotate: spin }] }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>
      <View style={[
        styles.contentContainer, 
        { 
          margin: borderWidth, 
          borderRadius: borderRadius - borderWidth,
          backgroundColor: theme.colors.background 
        }, 
        contentContainerStyle
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientContainer: {
    position: 'absolute',
    width: '400%', // Large enough to cover rotation and corners
    height: '400%',
    top: '-150%',
    left: '-150%',
  },
  gradient: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    overflow: 'hidden',
  },
});
