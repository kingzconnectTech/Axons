import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';

export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  }
};

export const requestUserPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('POST_NOTIFICATIONS denied — notifications WILL NOT SHOW');
          return;
        }
        console.log('Notification permission granted.');
      }
    } catch (err) {
      console.warn(err);
    }
  }

  // Ensure messaging().requestPermission() is called directly
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
        console.log('Foreground FCM:', remoteMessage);
        
        const title = 
          remoteMessage.notification?.title || 
          remoteMessage.data?.title || 
          'Notification';
        
        const body = 
          remoteMessage.notification?.body || 
          remoteMessage.data?.body || 
          '';

        try {
            await notifee.displayNotification({
                title,
                body,
                android: {
                    channelId: 'default',
                    importance: AndroidImportance.HIGH,
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
