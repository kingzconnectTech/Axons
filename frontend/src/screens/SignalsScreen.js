import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Button, Text, TextInput, Chip, ActivityIndicator, useTheme, Surface, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';
import { sendSignalNotification } from '../services/NotificationService';
import { useBot } from '../context/BotContext';

const API_URL = API_URLS.SIGNALS;
const AUTOTRADE_URL = API_URLS.AUTOTRADE;
const { width } = Dimensions.get('window');

// Default credentials for Signals Mode (Paper Trading)
const DEFAULT_EMAIL = "prosperousdellahs@gmail.com";
const DEFAULT_PASSWORD = "Prosperous911@";

export default function SignalsScreen() {
  const theme = useTheme();
  const { isBotRunning, botStats, setEmail, fetchStatus } = useBot();
  
  const [pair, setPair] = useState('EURUSD-OTC');
  const [timeframe, setTimeframe] = useState(1);
  const [strategy, setStrategy] = useState('RSI + Support & Resistance Reversal');
  
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  
  // Track last processed signal timestamp to avoid duplicates
  const lastSignalTimeRef = useRef(0);

  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);

  const otcPairs = ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC', 'NZDUSD-OTC', 'AUDUSD-OTC'];
  const strategies = ['RSI + Support & Resistance Reversal'];
  const timeframes = [1, 2, 3, 4, 5, 15];

  // Watch for bot stats updates (Persistent Signals)
  useEffect(() => {
    if (botStats && botStats.last_signal) {
      const sig = botStats.last_signal;
      
      // Check if this is a new signal
      if (sig.timestamp > lastSignalTimeRef.current) {
        lastSignalTimeRef.current = sig.timestamp;
        
        // Update UI
        setSignal({
          action: sig.action,
          confidence: sig.confidence,
          pair: sig.pair
        });
        
        // Notify
        sendSignalNotification(sig.pair, sig.action, sig.confidence);
        setSnackbarVisible(true);
      }
    }
  }, [botStats]);

  const handleStartStream = async () => {
    setLoading(true);
    try {
      // 1. Set Context Email (triggers background polling)
      setEmail(DEFAULT_EMAIL);
      
      // 2. Start Backend Session (Paper Mode)
      const config = {
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
        account_type: "PRACTICE",
        pairs: [pair],
        amount: 1, // Dummy amount
        timeframe: timeframe,
        strategy: strategy,
        stop_loss: 0,
        take_profit: 0,
        max_consecutive_losses: 10,
        max_trades: 1000,
        paper_trade: true // Enable Signals Only Mode
      };
      
      await axios.post(`${AUTOTRADE_URL}/start`, config);
      
      // Force immediate status fetch
      fetchStatus();
      
    } catch (error) {
      console.error("Failed to start stream:", error);
      alert(error.response?.data?.detail || "Failed to start signals stream");
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    setLoading(true);
    try {
      await axios.post(`${AUTOTRADE_URL}/stop/${DEFAULT_EMAIL}`);
      fetchStatus();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', letterSpacing: 2 }}>AI SIGNALS</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 }}>MARKET ANALYSIS</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* Live Stream Dashboard */}
        {isBotRunning && (
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
                  <Text variant="headlineLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{botStats?.total_trades || 0}</Text>
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
                  label="Asset Pair"
                  value={pair}
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
                  <TextInput
                    label="Strategy"
                    value={strategy}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                    theme={{ colors: { outline: theme.dark ? '#3E4C69' : theme.colors.outline, background: theme.dark ? '#161B29' : theme.colors.surface } }}
                    textColor={theme.colors.onSurface}
                    right={<TextInput.Icon icon="chevron-down" color={theme.colors.onSurfaceVariant} />}
                  />
                </TouchableOpacity>
              </View>

              {!isBotRunning ? (
                <Button 
                  mode="contained" 
                  onPress={handleStartStream} 
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
                  onPress={handleStopStream} 
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
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>LATEST SIGNAL</Text>
                <Surface style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}>
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
      </View>

      {/* Modals */}
      <SelectionModal
        visible={pairModalVisible}
        onClose={() => setPairModalVisible(false)}
        title="Select Asset Pair"
        options={otcPairs.map(p => ({ label: p, value: p, icon: 'chart-line' }))}
        value={pair}
        onSelect={setPair}
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
        options={strategies.map(s => ({ label: s, value: s, icon: 'robot' }))}
        value={strategy}
        onSelect={setStrategy}
        icon="brain"
      />

      <Snackbar
         visible={snackbarVisible}
         onDismiss={() => setSnackbarVisible(false)}
         duration={4000}
         style={{ backgroundColor: signal?.action === 'CALL' ? '#1B3B2F' : '#3B1B1B', marginBottom: 20 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
           {signal?.action === 'CALL' ? '🟢 CALL' : '🔴 PUT'} Signal Detected on {signal?.pair}
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
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dashboardCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  resultCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  resultGradient: {
    padding: 24,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  analyzeButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  stopButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  resultHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  signalDisplay: {
    alignItems: 'center',
    width: '100%',
  },
  signalIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  confidenceBar: {
    marginTop: 24,
    alignItems: 'center',
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  }
});