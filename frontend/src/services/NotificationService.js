import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let messaging;
if (!isExpoGo) {
    try {
        messaging = require('@react-native-firebase/messaging').default;
    } catch (e) {
        console.warn("Firebase messaging module not found:", e);
    }
}

// CRITICAL: Set background handler outside of any component or function export
// This must be at the top level of the file
if (messaging) {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
    });
}

const getMessaging = () => {
    if (isExpoGo || !messaging) {
        console.warn("Firebase Messaging is not available in Expo Go. Please use a development build.");
        return {
            requestPermission: async () => 1, // Authorized
            getToken: async () => "EXPO_GO_DUMMY_TOKEN",
            onTokenRefresh: () => () => {},
            onMessage: () => () => {},
            setBackgroundMessageHandler: () => {},
            onNotificationOpenedApp: () => () => {},
            getInitialNotification: async () => null,
        };
    }
    try {
        return messaging();
    } catch (e) {
        console.error("Failed to initialize Firebase Messaging:", e);
        return {
            requestPermission: async () => 1,
            getToken: async () => null,
            onTokenRefresh: () => () => {},
            onMessage: () => () => {},
            setBackgroundMessageHandler: () => {},
            onNotificationOpenedApp: () => () => {},
            getInitialNotification: async () => null,
        };
    }
};

export const requestUserPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted.');
        } else {
          console.log('Notification permission denied.');
        }
      }
    } catch (err) {
      console.warn(err);
    }
  }

  const authStatus = await getMessaging().requestPermission();
  const enabled =
    authStatus === 1 || // AuthorizationStatus.AUTHORIZED
    authStatus === 2; // AuthorizationStatus.PROVISIONAL

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
  
  // Create default channel for Notifee
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
};

export const getToken = async () => {
    try {
        const token = await getMessaging().getToken();
        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Failed to get FCM token:', error);
        return null;
    }
};

export const onTokenRefresh = (callback) => {
    return getMessaging().onTokenRefresh(token => {
        console.log('FCM Token Refreshed:', token);
        if (callback) callback(token);
    });
};

export const onForegroundMessage = (callback) => {
    return getMessaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived!', remoteMessage);
        
        // Display notification using Notifee for better UX
        try {
            await notifee.displayNotification({
                title: remoteMessage.notification?.title,
                body: remoteMessage.notification?.body,
                android: {
                    channelId: 'default',
                    importance: AndroidImportance.HIGH,
                    // smallIcon: 'ic_launcher', // Optional: customize icon
                },
            });
        } catch (e) {
            console.error("Notifee error:", e);
        }

        if (callback) callback(remoteMessage);
    });
};

// Handle Notification Opened (Background State)
export const onNotificationOpenedApp = (callback) => {
    return getMessaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage.notification);
        if (callback) callback(remoteMessage);
    });
};

// Handle Notification Opened (Quit State)
export const getInitialNotification = async () => {
    try {
        const remoteMessage = await getMessaging().getInitialNotification();
        if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage.notification);
            return remoteMessage;
        }
    } catch (error) {
        console.error('Failed to get initial notification:', error);
    }
    return null;
};
