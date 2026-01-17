import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';
import { ONESIGNAL_APP_ID } from '../config';

export function initializeOneSignal() {
  try {
    if (!OneSignal || typeof OneSignal.initialize !== 'function') {
      return;
    }

    OneSignal.initialize(ONESIGNAL_APP_ID);

    if (
      OneSignal.Notifications &&
      typeof OneSignal.Notifications.requestPermission === 'function'
    ) {
      OneSignal.Notifications.requestPermission(true);
    }

    if (
      Platform.OS === 'android' &&
      OneSignal.Notifications &&
      typeof OneSignal.Notifications.addForegroundWillDisplayListener === 'function'
    ) {
      OneSignal.Notifications.addForegroundWillDisplayListener(event => {
        const notification = event.getNotification();
        if (notification && typeof notification.display === 'function') {
          notification.display();
        }
      });
    }
  } catch (e) {
    console.log('OneSignal initialize failed', e);
  }
}

export async function getOneSignalPlayerId() {
  try {
    if (
      !OneSignal ||
      !OneSignal.User ||
      typeof OneSignal.User.getOnesignalIdAsync !== 'function'
    ) {
      return null;
    }
    const deviceState = await OneSignal.User.getOnesignalIdAsync();
    if (!deviceState) {
      return null;
    }
    return deviceState;
  } catch (e) {
    console.log('OneSignal getOneSignalPlayerId failed', e);
    return null;
  }
}
