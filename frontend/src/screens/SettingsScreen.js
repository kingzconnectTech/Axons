import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, Switch, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { isNotificationPermissionGranted, registerForPushNotificationsAsync } from '../services/NotificationService';

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  // State for settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(null);
  const [checkingNotificationPermission, setCheckingNotificationPermission] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    refreshNotificationPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const savedNotifs = await AsyncStorage.getItem('notifications_enabled');
      if (savedNotifs !== null) setNotificationsEnabled(JSON.parse(savedNotifs));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const refreshNotificationPermission = async () => {
    try {
      setCheckingNotificationPermission(true);
      const granted = await isNotificationPermissionGranted();
      setSystemNotificationsEnabled(granted);
    } catch (error) {
      setSystemNotificationsEnabled(null);
    } finally {
      setCheckingNotificationPermission(false);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('notifications_enabled', JSON.stringify(notificationsEnabled));
      if (notificationsEnabled) {
        await registerForPushNotificationsAsync();
        await refreshNotificationPermission();
        const granted = await isNotificationPermissionGranted();
        if (!granted) {
          Alert.alert(
            'Notifications Disabled',
            'System notification permission is not granted. Enable notifications in your device settings for AXON to send alerts.'
          );
        }
      }
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={isDark ? [theme.colors.background, '#1F2636'] : ['#FFFFFF', '#F5F7FA']}
        style={styles.background}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Preferences */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={24} color={theme.colors.tertiary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              App Preferences
            </Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
            />
          </View>
          <Divider style={styles.divider} />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Enable Notifications</Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                }}
              >
                {checkingNotificationPermission
                  ? 'Checking permission...'
                  : systemNotificationsEnabled === null
                  ? 'Permission status unknown'
                  : systemNotificationsEnabled
                  ? 'System permission: On'
                  : 'System permission: Off'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              color={theme.colors.primary}
            />
          </View>
        </Surface>

        <Button
          mode="contained"
          onPress={saveSettings}
          loading={isLoading}
          style={styles.saveButton}
          contentStyle={{ height: 50 }}
          icon="content-save"
        >
          Save Settings
        </Button>
        
        <Text style={styles.versionText}>Axon v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#161B29',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginLeft: 10,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1F2636',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 8,
  },
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  }
});
