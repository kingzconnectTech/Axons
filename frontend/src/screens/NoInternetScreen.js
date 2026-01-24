import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { responsiveFontSize, normalize } from '../utils/responsive';

export default function NoInternetScreen({ onRetry, loading }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.dark ? ['#0A0E17', '#1F2636'] : ['#FFFFFF', '#F5F7FA']}
        style={StyleSheet.absoluteFill}
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
        <View style={styles.iconWrapper}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.dark ? '#2C3445' : '#E3E6E9' },
            ]}
          >
            <MaterialCommunityIcons
              name="wifi-off"
              size={normalize(64)}
              color={theme.colors.error}
            />
          </View>
        </View>

        <Text
          variant="headlineMedium"
          style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginTop: normalize(16), fontSize: responsiveFontSize(24) }}
        >
          No Internet Connection
        </Text>

        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: normalize(12),
            fontSize: responsiveFontSize(14),
          }}
        >
          Please check your network connection and tap refresh to try again.
        </Text>

        <Button
          mode="contained"
          onPress={onRetry}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: normalize(6) }}
          labelStyle={{ fontSize: responsiveFontSize(16) }}
        >
          Refresh
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalize(24),
  },
  card: {
    width: '100%',
    borderRadius: normalize(20),
    padding: normalize(24),
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: normalize(96),
    height: normalize(96),
    borderRadius: normalize(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: normalize(24),
    borderRadius: 999,
    alignSelf: 'stretch',
  },
});

