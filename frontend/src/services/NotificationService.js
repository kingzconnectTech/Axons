import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
// import messaging from '@react-native-firebase/messaging';

export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
};

export const requestUserPermission = async () => {
  console.log('requestUserPermission mocked (SafeMode)');
  return;
  // if (Platform.OS === 'android') {
  //   try {
  //     if (Platform.Version >= 33) {
  //       const granted = await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  //       );
  //       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
  //         console.log('POST_NOTIFICATIONS denied — notifications WILL NOT SHOW');
  //         return;
  //       }
  //       console.log('Notification permission granted.');
  //     }
  //   } catch (err) {
  //     console.warn(err);
  //   }
  // }

  // // Ensure messaging().requestPermission() is called directly
  // const authStatus = await messaging().requestPermission();
  // const enabled =
  //   authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  //   authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  // if (enabled) {
  //   console.log('Authorization status:', authStatus);
  // }
};

export const checkNotificationPermission = async () => {
  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus === 0) {
      console.log("User has denied notifications (Notifee check)");
      return false;
  }
  return true;
};

export const getToken = async () => {
    console.log('getToken mocked (SafeMode)');
    return null;
    // try {
    //     const token = await messaging().getToken();
    //     console.log('FCM Token:', token);
    //     return token;
    // } catch (error) {
    //     console.error('Failed to get FCM token:', error);
    //     return null;
    // }
};

export const onTokenRefresh = (callback) => {
    console.log('onTokenRefresh mocked (SafeMode)');
    return () => {};
    // return messaging().onTokenRefresh(token => {
    //     console.log('FCM Token Refreshed:', token);
    //     if (callback) callback(token);
    // });
};

export const displayLocalNotification = async (title, body, data = {}) => {
    try {
        await setupNotificationChannel(); // Ensure channel exists
        await notifee.displayNotification({
            title,
            body,
            data,
            android: {
                channelId: 'default',
                importance: AndroidImportance.HIGH,
                largeIcon: 'ic_launcher',
                smallIcon: 'ic_launcher',
                pressAction: {
                    id: 'default',
                },
            },
        });
        console.log("[NotificationService] Notification displayed:", title);
    } catch (error) {
        console.error("[NotificationService] Display Error:", error);
    }
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

        await displayLocalNotification(title, body, remoteMessage.data);

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

export const onNotifeeForegroundEvent = (callback) => {
    return notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
            console.log('User pressed notification:', detail.notification);
            if (callback) callback(detail.notification);
        }
    });
};

export const getInitialNotifeeNotification = async () => {
    try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
            console.log('App opened from quit state via Notifee notification:', initialNotification.notification);
            return initialNotification.notification;
        }
    } catch (error) {
        console.error('Failed to get initial Notifee notification:', error);
    }
    return null;
};
