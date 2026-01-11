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

  useEffect(() => {
    // Load email initially
    const loadEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('user_email');
      if (savedEmail) setEmail(savedEmail);
    };
    loadEmail();
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
        console.log("App resumed - refreshing bot status");
        fetchStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [email]);

  return (
    <BotContext.Provider value={{ isBotRunning, botStats, fetchStatus, setEmail }}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => useContext(BotContext);
