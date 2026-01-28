import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URLS } from '../config';

// import auth from '@react-native-firebase/auth';

const BotContext = createContext();

export const BotProvider = ({ children }) => {
  const [email, setEmail] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);

  // useEffect(() => {
  //   // Listen to Firebase Auth changes to keep email in sync
  //   const unsubscribe = auth().onAuthStateChanged(async (user) => {
  //     if (user && user.email) {
  //       console.log("[BotContext] User authenticated:", user.email);
  //       setEmail(user.email);
  //       // Also save to AsyncStorage for persistence/legacy
  //       await AsyncStorage.setItem('user_email', user.email);
  //     } else {
  //       // Fallback to anonymous ID if logged out
  //       const savedEmail = await AsyncStorage.getItem('device_uuid');
  //       if (savedEmail) {
  //           setEmail(savedEmail);
  //       } else {
  //            // Create new anon ID if absolutely needed, or wait
  //            const newAnon = `anon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  //            await AsyncStorage.setItem('device_uuid', newAnon);
  //            setEmail(newAnon);
  //       }
  //     }
  //   });

  //   return unsubscribe;
  // }, []);

  // Handle App State changes (Background -> Active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && email) {
        console.log("App resumed - syncing token");
        syncDeviceToken();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [email]);

  const syncDeviceToken = async () => {
    if (email && fcmToken) {
      try {
        console.log(`[BotContext] Syncing token for ${email}...`);
        await axios.post(`${API_URLS.SIGNALS}/token`, {
          email: email,
          token: fcmToken
        });
        console.log("[BotContext] FCM Token synced with backend");
        return true;
      } catch (error) {
        console.error("[BotContext] Failed to sync FCM Token:", error.message);
        // Retry once after 5 seconds if failed
        setTimeout(async () => {
             try {
                 console.log("[BotContext] Retrying token sync...");
                 await axios.post(`${API_URLS.SIGNALS}/token`, {
                    email: email,
                    token: fcmToken
                 });
                 console.log("[BotContext] Retry successful");
             } catch (retryError) {
                 console.error("[BotContext] Retry failed:", retryError.message);
             }
        }, 5000);
        return false;
      }
    }
    return false;
  };

  // Sync FCM Token with Backend
  useEffect(() => {
    syncDeviceToken();
  }, [email, fcmToken]);

  return (
    <BotContext.Provider value={{ email, setEmail, fcmToken, setFcmToken, syncDeviceToken }}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => useContext(BotContext);
