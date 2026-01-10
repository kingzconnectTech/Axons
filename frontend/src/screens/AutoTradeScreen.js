import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Button, Text, TextInput, Card, SegmentedButtons, useTheme, Surface, Divider, Avatar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';

const API_URL = API_URLS.AUTOTRADE;
const { width } = Dimensions.get('window');

export default function AutoTradeScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('PRACTICE');
  const [pair, setPair] = useState('EURUSD-OTC');
  const [amount, setAmount] = useState('1');
  const [timeframe, setTimeframe] = useState('1');
  
  const otcPairs = ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC', 'NZDUSD-OTC', 'AUDUSD-OTC'];
  const [strategy, setStrategy] = useState('RSI Reversal');
  const [stopLoss, setStopLoss] = useState('10');
  const [takeProfit, setTakeProfit] = useState('20');
  const [maxLosses, setMaxLosses] = useState('3');
  const [maxTrades, setMaxTrades] = useState('50');
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal visibility states
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);

  // Options for modals
  const pairOptions = otcPairs.map(p => ({ label: p, value: p, icon: 'currency-usd' }));
  
  const strategyOptions = [
    { label: 'RSI Reversal', value: 'RSI Reversal', icon: 'chart-bell-curve-cumulative' },
    { label: 'Bollinger Bands', value: 'Bollinger Bands', icon: 'chart-timeline-variant' },
    { label: 'MACD Cross', value: 'MACD Cross', icon: 'chart-multiline' },
    { label: 'MHI', value: 'MHI', icon: 'chart-sankey' },
    { label: 'AGGRESIVE', value: 'AGGRESIVE', icon: 'flash' }
  ];

  const timeframeOptions = [
    { label: '1 Minute', value: '1', icon: 'clock-outline' },
    { label: '5 Minutes', value: '5', icon: 'clock-outline' },
    { label: '15 Minutes', value: '15', icon: 'clock-outline' }
  ];

  useEffect(() => {
    let interval;
    if (status && status.active) {
      interval = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [status?.active]);

  const fetchStatus = async () => {
    if (!email) return;
    try {
      const response = await axios.get(`${API_URL}/status/${email}`);
      setStatus(response.data);
    } catch (error) {
      console.log("Status fetch error", error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/start`, {
        email,
        password,
        account_type: accountType,
        pair,
        amount: parseFloat(amount),
        timeframe: parseInt(timeframe),
        strategy,
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        max_consecutive_losses: parseInt(maxLosses),
        max_trades: parseInt(maxTrades)
      });
      fetchStatus();
    } catch (error) {
      alert('Failed to start: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/stop/${email}`);
      fetchStatus();
    } catch (error) {
      alert('Failed to stop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.secondaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={styles.headerGradient}
      >
        <ParticlesBackground />
        <View style={styles.headerContent}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', letterSpacing: 2 }}>AUTO BOT</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 }}>AUTOMATED TRADING</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* Live Status Dashboard */}
        {status && status.active && (
          <Surface style={[styles.dashboardCard, { shadowColor: theme.colors.secondary }]} elevation={4}>
            <LinearGradient
               colors={['#1B3B2F', '#161B29']}
               style={styles.cardGradient}
            >
              <View style={styles.dashboardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusDot, { backgroundColor: '#00E676', shadowColor: '#00E676', shadowRadius: 8, shadowOpacity: 0.8 }]} />
                  <Text variant="titleMedium" style={{ marginLeft: 12, color: theme.colors.onSurface, fontWeight: 'bold' }}>SYSTEM ACTIVE</Text>
                </View>
                <Surface style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                   <Text variant="labelSmall" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>{accountType}</Text>
                </Surface>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>PROFIT</Text>
                  <Text variant="headlineSmall" style={{ color: status.profit >= 0 ? '#00E676' : theme.colors.error, fontWeight: 'bold' }}>
                    ${status.profit.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>WINS</Text>
                  <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{status.wins}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>LOSSES</Text>
                  <Text variant="titleLarge" style={{ color: theme.colors.error, fontWeight: 'bold' }}>{status.losses}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>TOTAL</Text>
                  <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{status.total_trades}</Text>
                </View>
              </View>
            </LinearGradient>
          </Surface>
        )}

        {/* Account Credentials */}
        <Surface style={styles.card} elevation={2}>
           <LinearGradient colors={['#252D40', '#1F2636']} style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                 <MaterialCommunityIcons name="account-key" size={24} color={theme.colors.secondary} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginLeft: 12 }}>Credentials</Text>
            </View>

            <View style={styles.inputGroup}>
              <TextInput 
                label="Email" 
                value={email} 
                onChangeText={setEmail} 
                mode="outlined" 
                style={styles.input}
                textColor={theme.colors.onSurface}
                theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }}
                left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
              />
              <TextInput 
                label="Password" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
                mode="outlined" 
                style={styles.input}
                textColor={theme.colors.onSurface}
                theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }}
                left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
              />
              
              <SegmentedButtons
                value={accountType}
                onValueChange={setAccountType}
                buttons={[
                  { value: 'PRACTICE', label: 'PRACTICE', icon: 'school' },
                  { value: 'REAL', label: 'REAL', icon: 'cash' },
                ]}
                style={styles.segmentButton}
                theme={{ colors: { secondaryContainer: theme.colors.secondary, onSecondaryContainer: '#000' } }}
              />

              {/* Pair Selector */}
              <TouchableOpacity onPress={() => setPairModalVisible(true)} activeOpacity={0.7}>
                <View pointerEvents="none">
                  <TextInput
                    label="Asset"
                    value={pair}
                    mode="outlined"
                    style={styles.input}
                    theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }}
                    textColor={theme.colors.onSurface}
                    right={<TextInput.Icon icon="chevron-down" />}
                  />
                </View>
              </TouchableOpacity>
            </View>
           </LinearGradient>
        </Surface>

        {/* Strategy & Risk */}
        <Surface style={styles.card} elevation={2}>
          <LinearGradient colors={['#252D40', '#1F2636']} style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                 <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.primary} />
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginLeft: 12 }}>Strategy & Risk</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.row}>
                <View style={styles.half}>
                  <TextInput label="Amount ($)" value={amount} onChangeText={setAmount} mode="outlined" style={styles.input} keyboardType="numeric" theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }} textColor={theme.colors.onSurface} />
                </View>
                <View style={styles.half}>
                  {/* Timeframe Selector */}
                  <TouchableOpacity onPress={() => setTimeframeModalVisible(true)} activeOpacity={0.7}>
                    <View pointerEvents="none">
                      <TextInput
                        label="Timeframe"
                        value={timeframeOptions.find(t => t.value === timeframe)?.label || timeframe}
                        mode="outlined"
                        style={styles.input}
                        theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }}
                        textColor={theme.colors.onSurface}
                        right={<TextInput.Icon icon="chevron-down" />}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Strategy Selector */}
              <TouchableOpacity onPress={() => setStrategyModalVisible(true)} activeOpacity={0.7}>
                <View pointerEvents="none">
                  <TextInput 
                    label="Strategy" 
                    value={strategy} 
                    mode="outlined" 
                    style={styles.input} 
                    theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }}
                    textColor={theme.colors.onSurface}
                    right={<TextInput.Icon icon="chevron-down" />}
                  />
                </View>
              </TouchableOpacity>
              
              <Divider style={{ marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, fontWeight: 'bold' }}>RISK MANAGEMENT</Text>

              <View style={styles.row}>
                <TextInput label="Stop Loss ($)" value={stopLoss} onChangeText={setStopLoss} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }} textColor={theme.colors.onSurface} />
                <TextInput label="Take Profit ($)" value={takeProfit} onChangeText={setTakeProfit} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }} textColor={theme.colors.onSurface} />
              </View>

              <View style={styles.row}>
                <TextInput label="Max Losses" value={maxLosses} onChangeText={setMaxLosses} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }} textColor={theme.colors.onSurface} />
                <TextInput label="Max Trades" value={maxTrades} onChangeText={setMaxTrades} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" theme={{ colors: { outline: '#3E4C69', background: '#161B29' } }} textColor={theme.colors.onSurface} />
              </View>
            </View>
          </LinearGradient>
        </Surface>

        <View style={styles.buttonContainer}>
          {!status?.active ? (
            <Button 
              mode="contained" 
              onPress={handleStart} 
              loading={loading} 
              style={styles.startButton}
              contentStyle={{ height: 60 }}
              labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
              icon="play-circle"
            >
              START AUTO TRADE
            </Button>
          ) : (
            <Button 
              mode="contained" 
              onPress={handleStop} 
              loading={loading} 
              buttonColor={theme.colors.error} 
              style={styles.stopButton}
              contentStyle={{ height: 60 }}
              labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
              icon="stop-circle"
            >
              STOP TRADING
            </Button>
          )}
        </View>
      </View>

      {/* Modals */}
      <SelectionModal
        visible={pairModalVisible}
        onClose={() => setPairModalVisible(false)}
        title="Select Asset"
        options={pairOptions}
        value={pair}
        onSelect={setPair}
        icon="currency-usd"
      />
      <SelectionModal
        visible={strategyModalVisible}
        onClose={() => setStrategyModalVisible(false)}
        title="Select Strategy"
        options={strategyOptions}
        value={strategy}
        onSelect={setStrategy}
        icon="strategy"
      />
      <SelectionModal
        visible={timeframeModalVisible}
        onClose={() => setTimeframeModalVisible(false)}
        title="Select Timeframe"
        options={timeframeOptions}
        value={timeframe}
        onSelect={setTimeframe}
        icon="clock-outline"
      />
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
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
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
    gap: 12,
  },
  half: {
    flex: 1,
  },
  segmentButton: {
    marginBottom: 8,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chip: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  startButton: {
    borderRadius: 16,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#00E676',
  },
  stopButton: {
    borderRadius: 16,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }
});
