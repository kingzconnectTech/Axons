import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
              size={64}
              color={theme.colors.error}
            />
          </View>
        </View>

        <Text
          variant="headlineMedium"
          style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginTop: 16 }}
        >
          No Internet Connection
        </Text>

        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: 12,
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
          contentStyle={{ paddingVertical: 6 }}
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
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 24,
    borderRadius: 999,
    alignSelf: 'stretch',
  },
});

