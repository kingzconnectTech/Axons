import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URLS } from '../config';

const BotContext = createContext();

export const BotProvider = ({ children }) => {
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botStats, setBotStats] = useState(null);
  const [email, setEmail] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // Load email initially or generate anonymous ID
    const loadIdentity = async () => {
      let savedEmail = await AsyncStorage.getItem('user_email');
      
      if (!savedEmail) {
        // Fallback to anonymous ID
        savedEmail = await AsyncStorage.getItem('device_uuid');
        
        if (!savedEmail) {
          // Generate new anonymous ID
          savedEmail = `anon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await AsyncStorage.setItem('device_uuid', savedEmail);
        }
      }
      
      if (savedEmail) setEmail(savedEmail);
    };
    loadIdentity();
  }, []);

  const fetchStatus = async () => {
    if (!email) return;
    try {
      const response = await axios.get(`${API_URLS.AUTOTRADE}/status/${email}`);
      if (response.data) {
        setBotStats(response.data);
        setIsBotRunning(response.data.active);
      }
    } catch (error) {
      console.log("[BotContext] Status fetch error:", error.message);
    }
  };

  // Poll for status when app is active
  useEffect(() => {
    let interval;
    if (email) {
      fetchStatus(); // Initial fetch
      interval = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [email]);

  // Handle App State changes (Background -> Active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && email) {
        console.log("App resumed - refreshing bot status & syncing token");
        fetchStatus();
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
        await axios.post(`${API_URLS.AUTOTRADE}/token`, {
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
                 await axios.post(`${API_URLS.AUTOTRADE}/token`, {
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
    <BotContext.Provider value={{ isBotRunning, setIsBotRunning, botStats, setBotStats, fetchStatus, setEmail, fcmToken, setFcmToken, syncDeviceToken }}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => useContext(BotContext);
