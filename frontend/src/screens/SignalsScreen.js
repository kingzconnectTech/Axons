import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Button, Text, TextInput, Card, Chip, ActivityIndicator, useTheme, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URLS } from '../config';

const API_URL = API_URLS.SIGNALS;

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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Configuration Card */}
      <Surface style={[styles.configCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.cardHeader}>
           <MaterialCommunityIcons name="tune" size={24} color={theme.colors.primary} />
           <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Configuration</Text>
        </View>

        <View style={styles.inputGroup}>
           <TextInput
            label="Currency Pair"
            value={pair}
            onChangeText={setPair}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.background }]}
            textColor={theme.colors.onSurface}
            left={<TextInput.Icon icon="currency-usd" />}
          />
          
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Timeframe (min)</Text>
          <View style={styles.chipContainer}>
            {timeframes.map((tf) => (
              <Chip 
                key={tf} 
                selected={timeframe === tf} 
                onPress={() => setTimeframe(tf)}
                style={[styles.chip, timeframe === tf && { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: timeframe === tf ? theme.colors.primary : theme.colors.onSurfaceVariant }}
                showSelectedOverlay
              >
                {tf}m
              </Chip>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Strategy</Text>
          <View style={styles.chipContainer}>
            {strategies.map((s) => (
              <Chip 
                key={s} 
                selected={strategy === s} 
                onPress={() => setStrategy(s)}
                style={[styles.chip, strategy === s && { backgroundColor: theme.colors.secondaryContainer }]}
                textStyle={{ color: strategy === s ? theme.colors.secondary : theme.colors.onSurfaceVariant }}
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
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            icon="radar"
          >
            Analyze Market
          </Button>
        </View>
      </Surface>

      {/* Result Display */}
      {signal && (
        <Surface style={[styles.resultCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
          <View style={styles.resultHeader}>
             <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>Analysis Result</Text>
             <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{new Date().toLocaleTimeString()}</Text>
          </View>

          <View style={styles.signalDisplay}>
             <MaterialCommunityIcons 
               name={signal.action === 'CALL' ? 'arrow-up-circle' : (signal.action === 'PUT' ? 'arrow-down-circle' : 'minus-circle')} 
               size={80} 
               color={signal.action === 'CALL' ? theme.colors.secondary : (signal.action === 'PUT' ? theme.colors.error : theme.colors.outline)}
             />
             <Text 
               variant="displayMedium" 
               style={{ 
                 color: signal.action === 'CALL' ? theme.colors.secondary : (signal.action === 'PUT' ? theme.colors.error : theme.colors.outline),
                 fontWeight: 'bold',
                 marginTop: 10
               }}
             >
               {signal.action}
             </Text>
             <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 5 }}>
               Confidence Level
             </Text>
             <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
               {signal.confidence.toFixed(1)}%
             </Text>
          </View>
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  configCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    marginLeft: 10,
    fontWeight: 'bold',
  },
  inputGroup: {
    gap: 10,
  },
  input: {
    marginBottom: 5,
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 8,
  },
  analyzeButton: {
    marginTop: 10,
    borderRadius: 12,
  },
  resultCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  resultHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  signalDisplay: {
    alignItems: 'center',
    paddingVertical: 10,
  }
});
