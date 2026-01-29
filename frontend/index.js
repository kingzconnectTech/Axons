import { AppRegistry } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';

// REQUIRED RULE (FCM): setBackgroundMessageHandler must be registered at the JS entry point
let lastId = null;

// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   console.log('Background FCM:', remoteMessage);
//
//   // Prevent duplicate notifications
//   const id = remoteMessage.messageId || `${remoteMessage.data?.pair}-${remoteMessage.data?.action}-${Date.now()}`;
//   if (id === lastId) return;
//   lastId = id;
//
//   const title = 
//     remoteMessage.data?.title || 'Signal Alert';
//
//   const body = 
//     remoteMessage.data?.body || '';
//
//   // Ensure channel exists (Background/Quit state)
//   await notifee.createChannel({
//       id: 'default',
//       name: 'Default Channel',
//       importance: AndroidImportance.HIGH,
//       sound: 'default',
//   });
//
//   await notifee.displayNotification({
//     title,
//     body,
//     data: remoteMessage.data,
//     android: {
//       channelId: 'default',
//       importance: AndroidImportance.HIGH,
//       largeIcon: 'ic_launcher',
//       smallIcon: 'ic_launcher', // fallback to launcher icon
//       pressAction: {
//         id: 'default',
//       },
//     },
//   });
// });

// "main" is the default component name for Expo Prebuild projects
AppRegistry.registerComponent('main', () => App);
