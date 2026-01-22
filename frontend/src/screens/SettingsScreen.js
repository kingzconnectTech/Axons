import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Surface, useTheme, Switch, Divider, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  // State for settings
  const [isLoading, setIsLoading] = useState(false);

  const saveSettings = async () => {
    setIsLoading(true);
    try {
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
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-account" size={24} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Legal & Support
            </Text>
          </View>
          <Divider style={styles.divider} />
          
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('PrivacyPolicy')} 
            style={styles.linkButton}
            contentStyle={{ justifyContent: 'flex-start' }}
            textColor={theme.colors.primary}
            icon="file-document-outline"
          >
            Privacy Policy
          </Button>

          <Button 
            mode="text" 
            onPress={() => Linking.openURL('mailto:support@axon.com')} 
            style={styles.linkButton}
            contentStyle={{ justifyContent: 'flex-start' }}
            textColor={theme.colors.primary}
            icon="email-outline"
          >
            Contact Us
          </Button>
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

        <Button 
          mode="outlined" 
          onPress={() => auth().signOut()} 
          style={styles.logoutButton}
          textColor={theme.colors.error}
          icon="logout"
        >
          Log Out
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  logoutButton: {
    marginBottom: 24,
    borderRadius: 8,
    borderColor: '#FF5252',
  },
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  }
});
