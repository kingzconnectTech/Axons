import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'axon_notification',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  let tokenData;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '13ba9648-45b1-4723-a646-1291ddef18d9', // EAS Project ID
    });
  } catch (error) {
    console.warn('Error fetching push token:', error);
    return null;
  }
  return tokenData?.data ?? null;
}

export async function getNotificationPermissionStatus() {
  const settings = await Notifications.getPermissionsAsync();
  return settings;
}

export async function isNotificationPermissionGranted() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function sendSignalNotification(pair, action, confidence) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'AXON Signal',
      body: `${pair} • ${action} • ${confidence.toFixed(1)}%`,
      sound: 'axon_notification',
    },
    trigger: null,
  });
}
