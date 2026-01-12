import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text, Dimensions, Easing } from 'react-native';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const CHARS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ1234567890';

const MatrixStream = ({ x, delay, speed, fontSize, length, containerHeight }) => {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  
  // Generate random string for this stream
  const streamText = useMemo(() => {
    return Array(length).fill(0).map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join('\n');
  }, [length]);

  const totalDistance = containerHeight + fontSize * length;
  const duration = (totalDistance / speed) * 1000;

  useEffect(() => {
    if (containerHeight <= 0) return;

    Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear
        })
      )
    ]).start();
  }, [containerHeight, duration, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-fontSize * length, containerHeight + fontSize]
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0]
  });

  // Matrix green colors
  const color = theme.dark ? '#00FF41' : '#008F11'; 

  if (containerHeight <= 0) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        opacity,
        transform: [{ translateY }]
      }}
    >
      <Text style={{ 
        color, 
        fontSize, 
        fontFamily: 'monospace',
        lineHeight: fontSize,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: color,
        textShadowRadius: theme.dark ? 4 : 1,
        opacity: theme.dark ? 0.8 : 0.4
      }}>
        {streamText}
      </Text>
    </Animated.View>
  );
};

const ParticlesBackground = () => {
  const [containerHeight, setContainerHeight] = useState(0);
  const fontSize = 14;
  
  const streams = useMemo(() => {
    const items = [];
    const count = 25; // Number of rain streams
    for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * width);
        const delay = Math.random() * 2000; // Start within 0-2s
        const speed = Math.floor(Math.random() * 150) + 100; // 100-250 px/s
        const length = Math.floor(Math.random() * 15) + 5; // 5-20 chars
        items.push({ key: i, x, delay, speed, length });
    }
    return items;
  }, []);

  return (
    <View 
      style={StyleSheet.absoluteFill} 
      pointerEvents="none"
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {streams.map(s => (
        <MatrixStream 
          key={s.key} 
          x={s.x} 
          delay={s.delay} 
          speed={s.speed} 
          length={s.length}
          fontSize={fontSize}
          containerHeight={containerHeight}
        />
      ))}
    </View>
  );
};

export default ParticlesBackground;
