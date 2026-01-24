import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from '../utils/SafeMobileAds';
import Constants from 'expo-constants';

const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-4647863166992264/5619668236';

export default function AdBanner() {
  const bannerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  // Prevent crash in Expo Go
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  return (
    <View style={styles.container}>
      {!failed && (
        <BannerAd
          ref={bannerRef}
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={() => {
            setFailed(false);
            console.log('Banner ad loaded');
          }}
          onAdFailedToLoad={error => {
            setFailed(true);
            console.log('Banner ad failed to load', error);
          }}
        />
      )}
      {failed && (
        <Text style={styles.placeholder}>
          Ad not available
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 12,
    color: '#888',
    paddingVertical: 4,
  },
});
