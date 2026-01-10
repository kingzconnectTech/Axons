import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, Card, Switch, SegmentedButtons } from 'react-native-paper';
import axios from 'axios';
import { API_URLS } from '../config';

const API_URL = API_URLS.AUTOTRADE;

export default function AutoTradeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('PRACTICE');
  const [amount, setAmount] = useState('1');
  const [timeframe, setTimeframe] = useState('1');
  const [strategy, setStrategy] = useState('RSI Reversal');
  const [stopLoss, setStopLoss] = useState('10');
  const [takeProfit, setTakeProfit] = useState('20');
  const [maxLosses, setMaxLosses] = useState('3');
  const [maxTrades, setMaxTrades] = useState('50');
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

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
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Account Settings" />
        <Card.Content>
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.input} />
          
          <SegmentedButtons
            value={accountType}
            onValueChange={setAccountType}
            buttons={[
              { value: 'PRACTICE', label: 'Practice' },
              { value: 'REAL', label: 'Real' },
            ]}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Trade Settings" />
        <Card.Content>
          <View style={styles.row}>
            <TextInput label="Amount ($)" value={amount} onChangeText={setAmount} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Timeframe (m)" value={timeframe} onChangeText={setTimeframe} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>
          
          <TextInput label="Strategy" value={strategy} onChangeText={setStrategy} mode="outlined" style={styles.input} />
          
          <View style={styles.row}>
            <TextInput label="Stop Loss" value={stopLoss} onChangeText={setStopLoss} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Take Profit" value={takeProfit} onChangeText={setTakeProfit} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>

          <View style={styles.row}>
            <TextInput label="Max Cons. Losses" value={maxLosses} onChangeText={setMaxLosses} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Max Trades" value={maxTrades} onChangeText={setMaxTrades} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        {!status?.active ? (
          <Button mode="contained" onPress={handleStart} loading={loading} style={styles.startButton}>
            Start Auto Trade
          </Button>
        ) : (
          <Button mode="contained" onPress={handleStop} loading={loading} buttonColor="red" style={styles.stopButton}>
            Stop Auto Trade
          </Button>
        )}
      </View>

      {status && (
        <Card style={styles.card}>
          <Card.Title title="Live Status" />
          <Card.Content>
            <Text>Status: {status.active ? "Running" : "Stopped"}</Text>
            <Text>Trades: {status.total_trades}</Text>
            <Text>Wins: {status.wins}</Text>
            <Text>Losses: {status.losses}</Text>
            <Text>Profit: {status.profit}</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  card: { marginBottom: 20 },
  input: { marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  buttonContainer: { marginBottom: 20 },
  startButton: { padding: 5 },
  stopButton: { padding: 5 }
});
