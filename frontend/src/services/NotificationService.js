import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

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

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
};

export const getToken = async () => {
    try {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Failed to get FCM token:', error);
        return null;
    }
};

export const onTokenRefresh = (callback) => {
    return messaging().onTokenRefresh(token => {
        console.log('FCM Token Refreshed:', token);
        if (callback) callback(token);
    });
};

export const onForegroundMessage = (callback) => {
    return messaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived!', remoteMessage);
        if (callback) callback(remoteMessage);
    });
};

// Background Message Handler
export const setBackgroundHandler = () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
        // You can perform background tasks here if needed
    });
};

// Handle Notification Opened (Background State)
export const onNotificationOpenedApp = (callback) => {
    return messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background state:', remoteMessage.notification);
        if (callback) callback(remoteMessage);
    });
};

// Handle Notification Opened (Quit State)
export const getInitialNotification = async () => {
    try {
        const remoteMessage = await messaging().getInitialNotification();
        if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage.notification);
            return remoteMessage;
        }
    } catch (error) {
        console.error('Failed to get initial notification:', error);
    }
    return null;
};
