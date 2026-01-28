import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useMemo } from 'react';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

console.log('[SafeMobileAds] isExpoGo:', isExpoGo);

// Default mock implementations
let mobileAds = {
  initialize: () => Promise.resolve(),
};

let BannerAd = () => null;

let BannerAdSize = { 
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  BANNER: 'BANNER',
  FULL_BANNER: 'FULL_BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
};

let TestIds = { 
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712', 
  ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  GAM_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  GAM_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  GAM_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
};

// Use a hook-compatible mock
let useInterstitialAd = () => {
  return useMemo(() => ({
    load: () => console.log('Ad load mocked (SafeMode)'),
    show: () => console.log('Ad show mocked (SafeMode)'),
    isLoaded: false,
    isClosed: true,
    error: null,
  }), []);
};

// FORCE MOCK FOR DEBUGGING
// if (!isExpoGo) {
//   try {
//     // Use require to conditionally load the native module
//     const RNGoogleMobileAds = require('react-native-google-mobile-ads');
    
//     // Assign real implementations
//     mobileAds = RNGoogleMobileAds.default;
//     BannerAd = RNGoogleMobileAds.BannerAd;
//     BannerAdSize = RNGoogleMobileAds.BannerAdSize;
//     TestIds = RNGoogleMobileAds.TestIds;
//     useInterstitialAd = RNGoogleMobileAds.useInterstitialAd;
//   } catch (e) {
//     console.warn('Failed to load react-native-google-mobile-ads', e);
//   }
// }

export default mobileAds;
export { BannerAd, BannerAdSize, TestIds, useInterstitialAd };
