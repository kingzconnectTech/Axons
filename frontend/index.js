import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// REQUIRED RULE (FCM): setBackgroundMessageHandler must be registered at the JS entry point
let lastId = null;

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background FCM:', remoteMessage);

  // Prevent duplicate notifications
  const id = remoteMessage.messageId || `${remoteMessage.data?.pair}-${remoteMessage.data?.action}-${Date.now()}`;
  if (id === lastId) return;
  lastId = id;

  const title = 
    remoteMessage.data?.title || 'Signal Alert';

  const body = 
    remoteMessage.data?.body || '';

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'default',
      importance: AndroidImportance.HIGH,
    },
  });
});

AppRegistry.registerComponent(appName, () => App);
