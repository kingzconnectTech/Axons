import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Button, Text, TextInput, Chip, ActivityIndicator, useTheme, Surface, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useInterstitialAd, TestIds } from '../utils/SafeMobileAds';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';
import AdBanner from '../components/AdBanner';
import { getOneSignalPlayerId } from '../services/OneSignalService';
import { isNotificationPermissionGranted } from '../services/NotificationService';

const API_URL = API_URLS.SIGNALS;
const { width } = Dimensions.get('window');

export default function SignalsScreen() {
  const theme = useTheme();
  const [selectedPairs, setSelectedPairs] = useState(['EURUSD-OTC']);
  const [timeframe, setTimeframe] = useState(1);
  const [strategy, setStrategy] = useState('RSI + Support & Resistance Reversal');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState({ total: 0 });
  const [history, setHistory] = useState([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [lastSignalAction, setLastSignalAction] = useState('');

  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(false);
  const [strategyInfoVisible, setStrategyInfoVisible] = useState(false);

  const INTERSTITIAL_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712';
  const interstitial = useInterstitialAd(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  
  const pairs = [
    { label: 'EUR/USD OTC', value: 'EURUSD-OTC', icon: 'chart-line' },
    { label: 'GBP/USD OTC', value: 'GBPUSD-OTC', icon: 'chart-line' },
    { label: 'EUR/JPY OTC', value: 'EURJPY-OTC', icon: 'chart-line' },
    { label: 'AUD/CAD OTC', value: 'AUDCAD-OTC', icon: 'chart-line' },
    { label: 'EUR/USD', value: 'EURUSD', icon: 'chart-line' },
    { label: 'EUR/GBP', value: 'EURGBP', icon: 'chart-line' },
    { label: 'AUD/USD', value: 'AUDUSD', icon: 'chart-line' },
    { label: 'USD/JPY', value: 'USDJPY', icon: 'chart-line' },
    { label: 'GBP/USD', value: 'GBPUSD', icon: 'chart-line' },
    { label: 'USD/CHF', value: 'USDCHF', icon: 'chart-line' },
    { label: 'EUR/JPY', value: 'EURJPY', icon: 'chart-line' },
    { label: 'GBP/JPY', value: 'GBPJPY', icon: 'chart-line' },
    { label: 'USD/CAD', value: 'USDCAD', icon: 'chart-line' },
  ];
  const strategies = [
    { 
        value: 'RSI + Support & Resistance Reversal', 
        label: 'RSI + Support & Resistance Reversal',
        description: 'Combines RSI overbought/oversold conditions with key support/resistance levels to identify potential reversal points.' 
    },
    { 
        value: 'OTC Mean Reversion', 
        label: 'OTC Mean Reversion',
        description: 'Capitalizes on the tendency of OTC asset prices to revert to their historical average after extreme moves.' 
    },
    { 
        value: 'OTC Volatility Trap Break–Reclaim', 
        label: 'OTC Volatility Trap Break–Reclaim',
        description: 'Identifies false breakouts (traps) in volatile OTC markets and signals entries when price reclaims the range.' 
    },
    { 
        value: 'OTC Trend-Pullback Engine Strategy', 
        label: 'OTC Trend-Pullback Engine Strategy',
        description: 'Follows strong OTC trends and enters on pullbacks to the moving average or dynamic support zones.' 
    },
    { 
        value: 'Real Trend Pullback', 
        label: 'Real Trend Pullback',
        description: 'Classic trend-following strategy for real markets, entering trades in the direction of the trend after a corrective pullback.' 
    },
    { 
        value: 'London Breakout', 
        label: 'London Breakout',
        description: 'Captures momentum generated during the opening of the London session, trading breakouts from the Asian session range.' 
    },
    { 
        value: 'NY Reversal', 
        label: 'NY Reversal',
        description: 'Looks for reversal patterns during the New York session, often occurring after the initial morning momentum fades.' 
    },
    { 
        value: 'Real Strategy Voting', 
        label: 'Real Strategy Voting',
        description: 'Aggregates signals from multiple strategies and executes based on a "voting" consensus for higher probability.' 
    }
  ];
  const timeframes = [1, 2, 3, 4, 5, 15];

  useEffect(() => {
    interstitial.load();
  }, [interstitial.load]);

  useEffect(() => {
    if (pendingToggle && interstitial.isClosed) {
      setPendingToggle(false);
      toggleStreamCore();
      interstitial.load();
    }
  }, [pendingToggle, interstitial.isClosed, interstitial.load]);

  useEffect(() => {
    // Check initial status
    checkStatus();
    
    // Poll status periodically (to keep UI in sync if backend is running)
    const statusInterval = setInterval(checkStatus, 3000); // 3s poll
    
    return () => clearInterval(statusInterval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/status`);
      if (response.data.active) {
        setStreaming(true);
        if (response.data.params) {
          const params = response.data.params;
          if (params.pairs) setSelectedPairs(params.pairs);
          else if (params.pair) setSelectedPairs([params.pair]);
          
          if (typeof params.timeframe !== 'undefined') setTimeframe(params.timeframe);
          if (params.strategy) setStrategy(params.strategy);
        }
        // Sync stats/last signal if available
        if (response.data.last_signal) {
            setSignal(response.data.last_signal);
        }
        setStreamStats(response.data.stats);
        if (response.data.history) {
          setHistory(response.data.history);
        }
      } else {
        setStreaming(false);
        setHistory([]);
      }
    } catch (error) {
      console.log("Status check failed", error);
    }
  };

  const toggleStreamCore = async () => {
    if (streaming) {
      try {
        await axios.post(`${API_URL}/stop`);
        setStreaming(false);
      } catch (e) {
        alert('Failed to stop stream');
      }
    } else {
      try {
        const permissionGranted = await isNotificationPermissionGranted();
        if (!permissionGranted) {
          alert('Notifications are disabled for this app. Streaming will continue without push alerts. You can enable notifications in your system settings.');
        }
        const token = await getOneSignalPlayerId();
        if (!token) {
          alert('Push notifications are not enabled for this device or build. Streaming will start without push alerts.');
        }
        await axios.post(`${API_URL}/start`, {
            pairs: selectedPairs,
            timeframe,
            strategy,
            push_token: token
        });
        setStreaming(true);
        setStreamStats({ total: 0 });
      } catch (e) {
        console.error(e);
        alert('Failed to start stream');
      }
    }
  };

  const toggleStream = async () => {
    if (interstitial.isLoaded) {
      setPendingToggle(true);
      interstitial.show();
    } else {
      await toggleStreamCore();
      interstitial.load();
    }
  };

  const handleAnalyze = async () => {
    // Manual analysis (when not streaming)
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        pairs: selectedPairs,
        timeframe,
        strategy
      });
      setSignal(response.data);
    } catch (error) {
      console.error(error);
      alert('Error fetching signal');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStrategyDescription = () => {
      const s = strategies.find(s => s.value === strategy);
      return s ? s.description : 'No description available.';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={styles.headerGradient}
      >
        <ParticlesBackground />
        <View style={styles.headerContent}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', letterSpacing: 2 }}>AXON TRADING ASSISTANT</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 }}>MARKET SIGNALS</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* Live Stream Dashboard */}
        {streaming && (
          <Surface style={[styles.dashboardCard, { shadowColor: theme.colors.primary }]} elevation={4}>
            <LinearGradient
               colors={theme.dark ? ['#1B3B2F', '#161B29'] : ['#E0F7FA', '#FFFFFF']}
               style={styles.cardGradient}
            >
              <View style={styles.dashboardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: '#00E676', shadowColor: '#00E676', shadowRadius: 8, shadowOpacity: 0.8 }]} />
                  <Text variant="titleMedium" style={{ marginLeft: 12, color: theme.colors.onSurface, fontWeight: 'bold' }}>STREAM ACTIVE</Text>
                </View>
                <Surface style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                   <Text variant="labelSmall" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>LIVE</Text>
                </Surface>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>SIGNALS FOUND</Text>
                  <Text variant="headlineLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{streamStats.total}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>STATUS</Text>
                  <Text variant="titleLarge" style={{ color: '#00E676', fontWeight: 'bold' }}>SCANNING</Text>
                </View>
              </View>
            </LinearGradient>
          </Surface>
        )}
        
        {/* Configuration Panel */}
        <Surface style={styles.card} elevation={4}>
          <LinearGradient
            colors={theme.dark ? ['#252D40', '#1F2636'] : ['#FFFFFF', '#F5F7FA']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                 <MaterialCommunityIcons name="tune" size={24} color={theme.colors.primary} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginLeft: 12 }}>Configuration</Text>
            </View>

            <View style={styles.inputGroup}>
              {/* Pair Selection */}
              <TouchableOpacity onPress={() => setPairModalVisible(true)}>
                  <TextInput
                  label="Asset Pairs"
                  value={
                    !selectedPairs || selectedPairs.length === 0 
                      ? '' 
                      : (selectedPairs.length > 1 
                          ? `${selectedPairs.length} Pairs Selected` 
                          : (pairs.find(p => p.value === selectedPairs[0])?.label || selectedPairs[0] || ''))
                  }
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                  theme={{ colors: { outline: theme.dark ? '#3E4C69' : theme.colors.outline, background: theme.dark ? '#161B29' : theme.colors.surface } }}
                  textColor={theme.colors.onSurface}
                  right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
                />
              </TouchableOpacity>
              
              <View style={styles.row}>
                {/* Timeframe Selection */}
                <TouchableOpacity onPress={() => setTimeframeModalVisible(true)} style={styles.half}>
                  <TextInput
                    label="Timeframe"
                    value={timeframe === 0 ? 'Auto' : (timeframe === 0.5 ? '30s' : `${timeframe}m`)}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                    theme={{ colors: { outline: theme.dark ? '#3E4C69' : theme.colors.outline, background: theme.dark ? '#161B29' : theme.colors.surface } }}
                    textColor={theme.colors.onSurface}
                    right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
                  />
                </TouchableOpacity>

                 {/* Strategy Selection */}
                <TouchableOpacity onPress={() => setStrategyModalVisible(true)} style={styles.half}>
                  <View>
                    <TextInput
                        label="Strategy"
                        value={strategy}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                        theme={{ colors: { outline: theme.dark ? '#3E4C69' : theme.colors.outline, background: theme.dark ? '#161B29' : theme.colors.surface } }}
                        textColor={theme.colors.onSurface}
                        right={
                            <TextInput.Icon 
                                icon="information" 
                                color={theme.colors.primary} 
                                onPress={() => setStrategyInfoVisible(true)}
                                forceTextInputFocus={false}
                            />
                        }
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {!streaming ? (
                <Button 
                  mode="contained" 
                  onPress={toggleStream} 
                  loading={loading}
                  style={styles.analyzeButton}
                  contentStyle={{ height: 56 }}
                  labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
                  icon="play-circle"
                >
                  START STREAM
                </Button>
              ) : (
                <Button 
                  mode="contained" 
                  onPress={toggleStream} 
                  buttonColor={theme.colors.error}
                  style={styles.stopButton}
                  contentStyle={{ height: 56 }}
                  labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
                  icon="stop-circle"
                >
                  STOP STREAM
                </Button>
              )}
            </View>
          </LinearGradient>
        </Surface>

        {/* Result Display */}
        {signal && (
          <Surface style={[styles.resultCard, { shadowColor: signal.action === 'CALL' ? theme.colors.secondary : theme.colors.error }]} elevation={5}>
            <LinearGradient
               colors={signal.action === 'CALL' ? ['#1B3B2F', '#161B29'] : (signal.action === 'PUT' ? ['#3B1B1B', '#161B29'] : ['#252D40', '#161B29'])}
               style={styles.resultGradient}
            >
              <View style={styles.resultHeader}>
                <View>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>LATEST SIGNAL</Text>
                    {signal.pair && (
                        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '900', marginTop: 4 }}>
                            {signal.pair.replace('-OTC', ' (OTC)')}
                        </Text>
                    )}
                </View>
                <Surface style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start' }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{new Date().toLocaleTimeString()}</Text>
                </Surface>
              </View>

              <View style={styles.signalDisplay}>
                <View style={[styles.signalIconRing, { borderColor: signal.action === 'CALL' ? theme.colors.secondary : (signal.action === 'PUT' ? theme.colors.error : theme.colors.outline) }]}>
                  <MaterialCommunityIcons 
                    name={signal.action === 'CALL' ? 'arrow-up' : (signal.action === 'PUT' ? 'arrow-down' : 'minus')} 
                    size={60} 
                    color={signal.action === 'CALL' ? theme.colors.secondary : (signal.action === 'PUT' ? theme.colors.error : theme.colors.outline)}
                  />
                </View>
                
                <Text 
                  variant="displayMedium" 
                  style={{ 
                    color: signal.action === 'CALL' ? theme.colors.secondary : (signal.action === 'PUT' ? theme.colors.error : theme.colors.outline),
                    fontWeight: '900',
                    marginTop: 16,
                    letterSpacing: 2
                  }}
                >
                  {signal.action}
                </Text>
                
                <View style={styles.confidenceBar}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>CONFIDENCE LEVEL</Text>
                  <Text variant="headlineLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {signal.confidence.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Surface>
        )}

        {/* History */}
        {history.length > 0 && (
          <Surface style={styles.card} elevation={4}>
            <LinearGradient
              colors={theme.dark ? ['#252D40', '#1F2636'] : ['#FFFFFF', '#F5F7FA']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <MaterialCommunityIcons name="history" size={24} color={theme.colors.secondary} />
                </View>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginLeft: 12 }}>
                  Signal History
                </Text>
              </View>

              {history.map((item, index) => (
                <View key={`${item.timestamp}-${index}`} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                      {item.pair}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {new Date(item.timestamp * 1000).toLocaleTimeString()} • {item.timeframe}m
                    </Text>
                  </View>
                  <View style={styles.historyBadge}>
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: item.action === 'CALL' ? theme.colors.secondary : theme.colors.error,
                        fontWeight: 'bold',
                      }}
                    >
                      {item.action}
                    </Text>
                  </View>
                  <View style={styles.historyStatus}>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontStyle: 'italic',
                      }}
                    >
                      {item.status === 'WIN' || item.status === 'LOSS'
                        ? item.status
                        : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </Surface>
        )}
      </View>

      {/* Modals */}
      <SelectionModal
        visible={pairModalVisible}
        onClose={() => setPairModalVisible(false)}
        title="Select Asset Pairs"
        options={pairs}
        value={selectedPairs}
        onSelect={setSelectedPairs}
        multi={true}
      />
      <SelectionModal
        visible={timeframeModalVisible}
        onClose={() => setTimeframeModalVisible(false)}
        title="Select Timeframe"
        options={timeframes.map(t => ({ label: t === 0.5 ? '30 Seconds' : `${t} Minutes`, value: t, icon: 'clock-outline' }))}
        value={timeframe}
        onSelect={setTimeframe}
        icon="clock"
      />
      <SelectionModal
        visible={strategyModalVisible}
        onClose={() => setStrategyModalVisible(false)}
        title="Select Strategy"
        options={strategies.map(s => ({ ...s, icon: 'robot' }))}
        value={strategy}
        onSelect={setStrategy}
        icon="robot-outline"
      />

      <Modal
        visible={strategyInfoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStrategyInfoVisible(false)}
      >
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center', padding:20}}>
            <Surface style={{padding:24, borderRadius:24, width:'100%', maxWidth:400, backgroundColor: theme.colors.surface}} elevation={5}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
                    <MaterialCommunityIcons name="information" size={28} color={theme.colors.primary} />
                    <Text variant="titleLarge" style={{fontWeight:'bold', marginLeft:12, flex:1, color:theme.colors.onSurface}}>{strategy}</Text>
                </View>
                <View style={{height:1, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginBottom:16}} />
                <Text variant="bodyLarge" style={{color:theme.colors.onSurfaceVariant, lineHeight:24}}>
                    {getSelectedStrategyDescription()}
                </Text>
                <Button mode="contained" onPress={() => setStrategyInfoVisible(false)} style={{marginTop:24, borderRadius:12}}>Close</Button>
            </Surface>
        </View>
      </Modal>

      <AdBanner />

      {/* In-App Notification Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ 
          backgroundColor: lastSignalAction === 'CALL' ? theme.colors.secondary : theme.colors.error,
          marginBottom: 20,
          borderRadius: 12
        }}
        action={{
          label: 'View',
          onPress: () => {
            // Already on screen
          },
          textColor: 'white'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {lastSignalAction} Signal Detected!
        </Text>
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
  },
  content: {
    padding: 16,
    marginTop: -20,
  },
  card: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    gap: 12,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  half: {
    width: '48%',
  },
  analyzeButton: {
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#00D1FF',
  },
  stopButton: {
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#FF5252',
  },
  resultCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resultGradient: {
    padding: 24,
    alignItems: 'center',
  },
  resultHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  signalDisplay: {
    alignItems: 'center',
    width: '100%',
  },
  signalIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  confidenceBar: {
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    width: '100%',
  },
  dashboardCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 6,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    width: '47%',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
  },
  historyStatus: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
});
