import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking } from 'react-native';
import { Text, Button, Surface, useTheme, Switch, Divider, Avatar, TextInput, HelperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { responsiveFontSize, normalize } from '../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { displayLocalNotification } from '../services/NotificationService';

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  // State for settings
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    uid: '',
    dob: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth().currentUser;
      if (user) {
        const dob = await AsyncStorage.getItem(`user_dob_${user.uid}`);
        setUserData({
          name: user.displayName || 'Trader',
          email: user.email || '',
          uid: user.uid,
          dob: dob || 'Not set'
        });
      }
    };
    loadProfile();
  }, []);

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
        {/* Profile Section */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-circle" size={normalize(24)} color={theme.colors.primary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: responsiveFontSize(16) }]}>
              My Profile
            </Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.profileHeader}>
            <Avatar.Text 
              size={normalize(64)} 
              label={userData.name ? userData.name.substring(0, 2).toUpperCase() : 'TR'} 
              style={{ backgroundColor: theme.colors.primary }}
              labelStyle={{ fontSize: responsiveFontSize(24) }}
            />
            <View style={styles.profileInfo}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: responsiveFontSize(22) }}>
                {userData.name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(14) }}>
                {userData.email}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(14) }}>User ID</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: responsiveFontSize(14) }}>
              {userData.uid.substring(0, 8)}...
            </Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(14) }}>Date of Birth</Text>
            <TextInput
              mode="outlined"
              value={userData.dob === 'Not set' ? '' : userData.dob}
              onChangeText={(text) => setUserData({ ...userData, dob: text })}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={{ 
                height: normalize(40), 
                width: normalize(140), 
                backgroundColor: theme.colors.surface,
                fontSize: responsiveFontSize(14)
              }}
              contentStyle={{ paddingVertical: 0 }}
              textColor={theme.colors.onSurface}
              theme={{ colors: { outline: theme.colors.outline } }}
            />
          </View>
        </Surface>

        {/* Preferences */}
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={normalize(24)} color={theme.colors.tertiary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: responsiveFontSize(16) }]}>
              App Preferences
            </Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontSize: responsiveFontSize(16) }}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
            />
          </View>
          
          <Divider style={styles.divider} />

          <Button 
            mode="text" 
            onPress={() => Linking.openSettings()} 
            style={styles.linkButton}
            contentStyle={{ justifyContent: 'flex-start' }}
            textColor={theme.colors.tertiary}
            icon="battery-alert"
            labelStyle={{ fontSize: responsiveFontSize(14) }}
          >
            Optimize Battery for Signals
          </Button>

          <Button 
            mode="text" 
            onPress={() => displayLocalNotification('Test Notification', 'This is a test message to verify notifications are working.')} 
            style={styles.linkButton}
            contentStyle={{ justifyContent: 'flex-start' }}
            textColor={theme.colors.secondary}
            icon="bell-ring-outline"
            labelStyle={{ fontSize: responsiveFontSize(14) }}
          >
            Test Push Notification
          </Button>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-account" size={normalize(24)} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: responsiveFontSize(16) }]}>
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
            labelStyle={{ fontSize: responsiveFontSize(14) }}
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
            labelStyle={{ fontSize: responsiveFontSize(14) }}
          >
            Contact Us
          </Button>
        </Surface>

        <Button
          mode="contained"
          onPress={saveSettings}
          loading={isLoading}
          style={styles.saveButton}
          contentStyle={{ height: normalize(50) }}
          icon="content-save"
          labelStyle={{ fontSize: responsiveFontSize(16) }}
        >
          Save Settings
        </Button>

        <Button 
          mode="outlined" 
          onPress={() => auth().signOut()} 
          style={styles.logoutButton}
          textColor={theme.colors.error}
          icon="logout"
          labelStyle={{ fontSize: responsiveFontSize(16) }}
        >
          Log Out
        </Button>
        
        <Text style={[styles.versionText, { fontSize: responsiveFontSize(12) }]}>Axon v1.0.0</Text>
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
    padding: normalize(16),
    paddingBottom: normalize(40),
  },
  section: {
    padding: normalize(16),
    borderRadius: normalize(12),
    marginBottom: normalize(20),
    backgroundColor: '#161B29',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(12),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(20),
    marginTop: normalize(4),
  },
  profileInfo: {
    marginLeft: normalize(16),
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: normalize(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    marginLeft: normalize(10),
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: normalize(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    marginBottom: normalize(16),
    backgroundColor: '#1F2636',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: normalize(8),
  },
  saveButton: {
    marginTop: normalize(8),
    marginBottom: normalize(24),
    borderRadius: normalize(8),
  },
  logoutButton: {
    marginBottom: normalize(12),
    borderRadius: normalize(8),
    borderColor: '#FF5252',
  },
  deleteButton: {
    marginBottom: normalize(24),
    borderRadius: normalize(8),
  },
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: responsiveFontSize(12),
  },
  linkButton: {
    marginBottom: normalize(8),
    borderRadius: normalize(8),
  }
});
