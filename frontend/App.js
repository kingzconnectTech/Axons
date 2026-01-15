import React, { useState, useEffect, useMemo } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from './src/context/ThemeContext';
import { BotProvider } from './src/context/BotContext';
import { registerForPushNotificationsAsync } from './src/services/NotificationService';
import mobileAds from 'react-native-google-mobile-ads';

import HomeScreen from './src/screens/HomeScreen';
import SignalsScreen from './src/screens/SignalsScreen';
import AutoTradeScreen from './src/screens/AutoTradeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import QuickScreen from './src/screens/QuickScreen';

const Stack = createStackNavigator();

const { LightTheme: AdaptedLightTheme, DarkTheme: AdaptedDarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavDefaultTheme,
  reactNavigationDark: NavDarkTheme,
});

const customDarkTheme = {
  ...MD3DarkTheme,
  ...AdaptedDarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...AdaptedDarkTheme.colors,
    primary: '#00D1FF', // Cyber Blue
    onPrimary: '#003344',
    primaryContainer: '#004F66',
    onPrimaryContainer: '#B8EAFF',
    secondary: '#00E676', // Success Green
    onSecondary: '#00391A',
    secondaryContainer: '#005226',
    onSecondaryContainer: '#99F6C0',
    tertiary: '#FF4081', // Accent Pink/Red
    onTertiary: '#660026',
    tertiaryContainer: '#93003A',
    onTertiaryContainer: '#FFD9E2',
    background: '#0A0E17', // Very Dark Blue/Black
    surface: '#161B29', // Slightly Lighter Card BG
    onSurface: '#E1E2E6',
    error: '#FF5252',
    elevation: {
      level0: 'transparent',
      level1: '#1F2636',
      level2: '#242C3D',
      level3: '#293345',
      level4: '#2E394C',
      level5: '#334054',
    },
  },
  roundness: 12,
};

const customLightTheme = {
  ...MD3LightTheme,
  ...AdaptedLightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...AdaptedLightTheme.colors,
    primary: '#006D85', // Darker Blue
    onPrimary: '#FFFFFF',
    primaryContainer: '#B8EAFF',
    onPrimaryContainer: '#001F29',
    secondary: '#006D39', // Darker Green
    onSecondary: '#FFFFFF',
    secondaryContainer: '#99F6C0',
    onSecondaryContainer: '#00210E',
    tertiary: '#B31952', // Darker Pink/Red
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD9E2',
    onTertiaryContainer: '#3F0011',
    background: '#F0F2F5', // Light Grayish Blue
    surface: '#FFFFFF',
    onSurface: '#191C1E',
    error: '#BA1A1A',
    elevation: {
      level0: 'transparent',
      level1: '#F5F6F8',
      level2: '#EEF0F4',
      level3: '#E8EAED',
      level4: '#E3E6E9',
      level5: '#DDE1E5',
    },
  },
  roundness: 12,
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    loadThemePreference();
    registerForPushNotificationsAsync();
    mobileAds().initialize().then(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (e) {
      console.log('Failed to load theme preference');
    }
  };

  const themeContext = useMemo(() => ({
    isDark,
    toggleTheme: async () => {
      const newTheme = !isDark;
      setIsDark(newTheme);
      try {
        await AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
      } catch (e) {
        console.log('Failed to save theme preference');
      }
    },
  }), [isDark]);

  const theme = isDark ? customDarkTheme : customLightTheme;

  return (
    <ThemeContext.Provider value={themeContext}>
      <BotProvider>
        <View style={styles.root}>
          <PaperProvider theme={theme}>
            <NavigationContainer theme={theme}>
              <StatusBar 
                barStyle={isDark ? "light-content" : "dark-content"} 
                backgroundColor={theme.colors.background} 
              />
              <Stack.Navigator 
                initialRouteName="Home"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: theme.colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    fontWeight: 'bold',
                    color: theme.colors.onSurface,
                  },
                  cardStyle: { backgroundColor: theme.colors.background }
                }}
              >
                <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Signals" component={SignalsScreen} options={{ title: 'Market Signals' }} />
                <Stack.Screen name="AutoTrade" component={AutoTradeScreen} options={{ title: 'Auto Trader' }} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
                <Stack.Screen name="Quick" component={QuickScreen} options={{ title: 'Flash' }} />
              </Stack.Navigator>
            </NavigationContainer>
          </PaperProvider>
          {showIntro && (
            <View style={styles.introOverlay}>
              <Image source={require('./assets/intro.gif')} style={styles.introImage} resizeMode="contain" />
            </View>
          )}
        </View>
      </BotProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0E17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introImage: {
    width: '100%',
    height: '100%',
  },
});
