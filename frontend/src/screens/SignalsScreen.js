import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { Button, Text, TextInput, Chip, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';

const API_URL = API_URLS.SIGNALS;
const { width } = Dimensions.get('window');

export default function SignalsScreen() {
  const theme = useTheme();
  const [pair, setPair] = useState('EURUSD-OTC');
  const [timeframe, setTimeframe] = useState(1);
  const [strategy, setStrategy] = useState('RSI Reversal');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  const otcPairs = ['EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC', 'NZDUSD-OTC', 'AUDUSD-OTC'];
  const strategies = ['RSI Reversal', 'SMA Trend'];
  const timeframes = [1, 5, 15];

  const handleAnalyze = async () => {
    setLoading(true);
    setSignal(null);
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        pair,
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
        
        {/* Configuration Panel */}
        <Surface style={styles.card} elevation={4}>
          <LinearGradient
            colors={['#252D40', '#1F2636']}
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
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Asset Pair</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {otcPairs.map((p) => (
                    <Chip 
                      key={p} 
                      selected={pair === p} 
                      onPress={() => setPair(p)}
                      style={[styles.chip, pair === p && { backgroundColor: theme.colors.primary }]}
                      textStyle={{ color: pair === p ? '#000' : theme.colors.onSurfaceVariant, fontWeight: 'bold' }}
                      showSelectedOverlay
                    >
                      {p}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
              
              {/* Timeframe Selection */}
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Timeframe (min)</Text>
              <View style={styles.chipContainer}>
                {timeframes.map((tf) => (
                  <Chip 
                    key={tf} 
                    selected={timeframe === tf} 
                    onPress={() => setTimeframe(tf)}
                    style={[styles.chip, timeframe === tf && { backgroundColor: theme.colors.primary }]}
                    textStyle={{ color: timeframe === tf ? '#000' : theme.colors.onSurfaceVariant, fontWeight: 'bold' }}
                    showSelectedOverlay
                  >
                    {tf}m
                  </Chip>
                ))}
              </View>

              {/* Strategy Selection */}
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Strategy</Text>
              <View style={styles.chipContainer}>
                {strategies.map((s) => (
                  <Chip 
                    key={s} 
                    selected={strategy === s} 
                    onPress={() => setStrategy(s)}
                    style={[styles.chip, strategy === s && { backgroundColor: theme.colors.secondary }]}
                    textStyle={{ color: strategy === s ? '#000' : theme.colors.onSurfaceVariant, fontWeight: 'bold' }}
                    showSelectedOverlay
                  >
                    {s}
                  </Chip>
                ))}
              </View>

              <Button 
                mode="contained" 
                onPress={handleAnalyze} 
                loading={loading}
                style={styles.analyzeButton}
                contentStyle={{ height: 56 }}
                labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
                icon="radar"
              >
                ANALYZE MARKET
              </Button>
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
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>ANALYSIS RESULT</Text>
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
  label: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  analyzeButton: {
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#00D1FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  }
});
