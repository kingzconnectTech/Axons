import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Button, Text, TextInput, Chip, ActivityIndicator, useTheme, Surface, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';
import { sendSignalNotification } from '../services/NotificationService';

const API_URL = API_URLS.SIGNALS;
const { width } = Dimensions.get('window');

export default function SignalsScreen() {
  const theme = useTheme();
  const [pair, setPair] = useState('EURUSD-OTC');
  const [timeframe, setTimeframe] = useState(1);
  const [strategy, setStrategy] = useState('RSI + Support & Resistance Reversal');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState({ total: 0 });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [lastSignalAction, setLastSignalAction] = useState('');

  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);

  const otcPairs = ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC', 'NZDUSD-OTC', 'AUDUSD-OTC'];
  const strategies = ['RSI + Support & Resistance Reversal'];
  const timeframes = [1, 2, 3, 4, 5, 15];

  useEffect(() => {
    let interval;
    if (streaming) {
      // Initial fetch
      handleAnalyze(true);
      // Poll every 5 seconds (Reduced frequency to avoid rate limits if user leaves it running)
      interval = setInterval(() => {
        handleAnalyze(true);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [streaming]);

  const handleAnalyze = async (isStream = false) => {
    if (!isStream) setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        pair,
        timeframe,
        strategy
      });
      setSignal(response.data);
      
      if (isStream) {
        // Only record valid trades (CALL/PUT)
        if (response.data.action === 'CALL' || response.data.action === 'PUT') {
          // Trigger Notifications
          sendSignalNotification(pair, response.data.action, response.data.confidence);
          setLastSignalAction(response.data.action);
          setSnackbarVisible(true);

          setStreamStats(prev => {
            const newTotal = prev.total + 1;
            // Since we can't know result instantly, we just track "Signals Found"
            // For now, let's reset wins/losses logic to just count total signals found
            return {
              ...prev,
              total: newTotal
            };
          });
        }
      }
    } catch (error) {
      console.error(error);
      if (!isStream) alert('Error fetching signal');
    } finally {
      if (!isStream) setLoading(false);
    }
  };

  const toggleStream = () => {
    if (streaming) {
      setStreaming(false);
    } else {
      setStreaming(true);
      setStreamStats({ total: 0 });
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
        icon="robot-outline"
      />

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
});
