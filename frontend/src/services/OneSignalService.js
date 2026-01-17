import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';
import { ONESIGNAL_APP_ID } from '../config';

export function initializeOneSignal() {
  OneSignal.initialize(ONESIGNAL_APP_ID);
  OneSignal.Notifications.requestPermission(true);

  if (Platform.OS === 'android') {
    OneSignal.Notifications.addForegroundWillDisplayListener(event => {
      event.getNotification().display();
    });
  }
}

export async function getOneSignalPlayerId() {
  const deviceState = await OneSignal.User.getOnesignalIdAsync();
  return deviceState || null;
}

