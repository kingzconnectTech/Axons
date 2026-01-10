import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, Card, Chip, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import { API_URLS } from '../config';

const API_URL = API_URLS.SIGNALS;

export default function SignalsScreen() {
  const [pair, setPair] = useState('EURUSD-OTC');
  const [timeframe, setTimeframe] = useState(1);
  const [strategy, setStrategy] = useState('RSI Reversal');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);

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
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Configuration" />
        <Card.Content>
          <TextInput
            label="Pair"
            value={pair}
            onChangeText={setPair}
            mode="outlined"
            style={styles.input}
          />
          
          <Text style={styles.label}>Timeframe (min)</Text>
          <View style={styles.chipContainer}>
            {timeframes.map((tf) => (
              <Chip 
                key={tf} 
                selected={timeframe === tf} 
                onPress={() => setTimeframe(tf)}
                style={styles.chip}
              >
                {tf}m
              </Chip>
            ))}
          </View>

          <Text style={styles.label}>Strategy</Text>
          <View style={styles.chipContainer}>
            {strategies.map((s) => (
              <Chip 
                key={s} 
                selected={strategy === s} 
                onPress={() => setStrategy(s)}
                style={styles.chip}
              >
                {s}
              </Chip>
            ))}
          </View>

          <Button 
            mode="contained" 
            onPress={handleAnalyze} 
            loading={loading}
            style={styles.button}
          >
            Analyze
          </Button>
        </Card.Content>
      </Card>

      {signal && (
        <Card style={[styles.card, styles.resultCard]}>
          <Card.Title title="Signal Result" />
          <Card.Content>
            <View style={styles.resultRow}>
              <Text variant="titleMedium">Action:</Text>
              <Text 
                variant="headlineMedium" 
                style={{ 
                  color: signal.action === 'CALL' ? 'green' : (signal.action === 'PUT' ? 'red' : 'grey'),
                  fontWeight: 'bold'
                }}
              >
                {signal.action}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text variant="titleMedium">Confidence:</Text>
              <Text variant="headlineMedium">{signal.confidence.toFixed(1)}%</Text>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  card: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 10,
    marginTop: 10,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  chip: {
    marginRight: 5,
  },
  button: {
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: '#e3f2fd',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  }
});
