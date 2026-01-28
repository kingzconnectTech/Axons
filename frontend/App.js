import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo } from 'react';
import { Image, StatusBar, StyleSheet, View, Alert } from 'react-native';
import { NavigationContainer, DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import auth from '@react-native-firebase/auth';
import { ThemeContext } from './src/context/ThemeContext';
import { BotProvider, useBot } from './src/context/BotContext';
// import { requestUserPermission, getToken, onTokenRefresh, onForegroundMessage, onNotificationOpenedApp, getInitialNotification, setupNotificationChannel, onNotifeeForegroundEvent, getInitialNotifeeNotification } from './src/services/NotificationService';
// import mobileAds from './src/utils/SafeMobileAds';
import { API_URLS } from './src/config';
import axios from 'axios';
import NoInternetScreen from './src/screens/NoInternetScreen';
import NetInfo from '@react-native-community/netinfo';

import HomeScreen from './src/screens/HomeScreen';
import SignalsScreen from './src/screens/SignalsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import QuickScreen from './src/screens/QuickScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

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

const NotificationInitializer = () => {
  // const { setFcmToken } = useBot();

  // useEffect(() => {
  //   const handleNotificationPress = (notification) => {
  //       Alert.alert(
  //           notification.title || 'Notification',
  //           notification.body || 'No details available',
  //           [{ text: 'OK' }]
  //       );
  //   };

  //   const init = async () => {
  //     await setupNotificationChannel();
  //     await requestUserPermission();
      
  //     let token = await getToken();
  //     if (!token) {
  //         console.log("Retrying token fetch in 3s...");
  //         await new Promise(r => setTimeout(r, 3000));
  //         token = await getToken();
  //     }
      
  //     if (token) {
  //         console.log("Token fetched successfully:", token);
  //         setFcmToken(token);
  //     } else {
  //         console.error("Failed to fetch token after retry.");
  //         Alert.alert("Notification Error", "Could not fetch push token. Please check your internet connection or restart the app.");
  //     }

  //     // Check if app was opened from quit state by notification (FCM)
  //     const initialNotification = await getInitialNotification();
  //     if (initialNotification) {
  //         console.log('App opened from quit state via notification', initialNotification);
  //     }

  //     // Check if app was opened from quit state by Notifee notification
  //     const initialNotifee = await getInitialNotifeeNotification();
  //     if (initialNotifee) {
  //         handleNotificationPress(initialNotifee);
  //     }
  //   };
  //   init();

  //   const unsubscribe = onTokenRefresh(token => {
  //     setFcmToken(token);
  //   });

  //   const unsubscribeMessage = onForegroundMessage(remoteMessage => {
  //       console.log('Foreground message received:', remoteMessage);
  //       // Notification is handled by Notifee in NotificationService
  //   });

  //   const unsubscribeOpened = onNotificationOpenedApp(remoteMessage => {
  //       console.log('App opened from background via notification', remoteMessage);
  //   });

  //   const unsubscribeNotifee = onNotifeeForegroundEvent(notification => {
  //       handleNotificationPress(notification);
  //   });

  //   return () => {
  //       unsubscribe();
  //       unsubscribeMessage();
  //       unsubscribeOpened();
  //       unsubscribeNotifee();
  //   };
  // }, []);

  return null;
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [checkingConnectivity, setCheckingConnectivity] = useState(true);
  
  // Auth State
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState();

  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  // useEffect(() => {
  //   const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
  //   return subscriber; // unsubscribe on unmount
  // }, []);
  
  // We need to access context, but App component wraps Providers.
  // We should move logic to a child component or handle it here if we refactor.
  // For now, let's keep it simple and just log/store in global if needed, 
  // or better, create a separate component for initialization inside providers.
  
  useEffect(() => {
    loadThemePreference();
    checkInternet();
    
    // try {
    //   if (typeof mobileAds.initialize === 'function') {
    //     mobileAds.initialize().then(() => {
    //          console.log('Mobile Ads Initialized');
    //     }).catch(e => {
    //          console.log('Mobile Ads Init failed', e);
    //     });
    //   }
    // } catch (e) {
    //   console.error('mobileAds initialize threw', e);
    // }
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

  const checkInternet = async () => {
    setCheckingConnectivity(true);
    try {
      const state = await NetInfo.fetch();
      // On Android, isInternetReachable can be null initially, fallback to isConnected
      const online = state.isConnected && (state.isInternetReachable !== false); 
      setIsOnline(!!online);
    } catch (e) {
      console.log('Internet check failed:', e);
      setIsOnline(false);
    } finally {
      setCheckingConnectivity(false);
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

  if (initializing) return null;

  return (
    <ThemeContext.Provider value={themeContext}>
      <BotProvider>
        {/* <NotificationInitializer /> */}
        <View style={styles.root}>
          <PaperProvider theme={theme}>
            <StatusBar 
              barStyle={isDark ? "light-content" : "dark-content"} 
              backgroundColor={theme.colors.background} 
            />
            {isOnline ? (
              <NavigationContainer theme={theme}>
                <Stack.Navigator 
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
                  {!user ? (
                    <>
                      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                    </>
                  ) : (
                    <>
                      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                      <Stack.Screen name="Signals" component={SignalsScreen} options={{ title: 'AXON Trading Assistant' }} />
                      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
                      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
                      <Stack.Screen name="Quick" component={QuickScreen} options={{ title: 'AXON Flash Scan' }} />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            ) : (
              <NoInternetScreen onRetry={checkInternet} loading={checkingConnectivity} />
            )}
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
