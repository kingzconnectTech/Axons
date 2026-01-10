import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, Card, Switch, SegmentedButtons, useTheme, Surface, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URLS } from '../config';

const API_URL = API_URLS.AUTOTRADE;

export default function AutoTradeScreen() {
  const theme = useTheme();
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Live Status Dashboard */}
      {status && status.active && (
        <Surface style={[styles.dashboardCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
           <View style={styles.dashboardHeader}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <View style={[styles.statusDot, { backgroundColor: theme.colors.secondary }]} />
               <Text variant="titleMedium" style={{ marginLeft: 8, color: theme.colors.onSurface }}>System Active</Text>
             </View>
             <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{accountType}</Text>
           </View>
           
           <View style={styles.statsGrid}>
             <View style={styles.statItem}>
               <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>PROFIT</Text>
               <Text variant="headlineSmall" style={{ color: status.profit >= 0 ? theme.colors.secondary : theme.colors.error }}>
                 ${status.profit.toFixed(2)}
               </Text>
             </View>
             <View style={styles.statItem}>
               <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>WINS</Text>
               <Text variant="titleLarge" style={{ color: theme.colors.primary }}>{status.wins}</Text>
             </View>
             <View style={styles.statItem}>
               <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>LOSSES</Text>
               <Text variant="titleLarge" style={{ color: theme.colors.error }}>{status.losses}</Text>
             </View>
             <View style={styles.statItem}>
               <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>TOTAL</Text>
               <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>{status.total_trades}</Text>
             </View>
           </View>
        </Surface>
      )}

      {/* Account Settings */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="contained">
        <Card.Title 
          title="Account Credentials" 
          titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
          left={(props) => <Avatar.Icon {...props} icon="account-key" size={40} style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.secondary} />}
        />
        <Card.Content>
          <TextInput 
            label="Email" 
            value={email} 
            onChangeText={setEmail} 
            mode="outlined" 
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />
          <TextInput 
            label="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            mode="outlined" 
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />
          
          <SegmentedButtons
            value={accountType}
            onValueChange={setAccountType}
            buttons={[
              { value: 'PRACTICE', label: 'Practice', icon: 'school' },
              { value: 'REAL', label: 'Real Account', icon: 'cash' },
            ]}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Strategy & Risk */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="contained">
        <Card.Title 
          title="Strategy & Risk" 
          titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
          left={(props) => <Avatar.Icon {...props} icon="shield-check" size={40} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />}
        />
        <Card.Content>
          <View style={styles.row}>
            <TextInput label="Amount ($)" value={amount} onChangeText={setAmount} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Timeframe (m)" value={timeframe} onChangeText={setTimeframe} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>
          
          <TextInput 
            label="Strategy" 
            value={strategy} 
            onChangeText={setStrategy} 
            mode="outlined" 
            style={styles.input} 
            right={<TextInput.Icon icon="chevron-down" />}
          />
          
          <Divider style={{ marginVertical: 10 }} />
          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>Risk Management</Text>

          <View style={styles.row}>
            <TextInput label="Stop Loss ($)" value={stopLoss} onChangeText={setStopLoss} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Take Profit ($)" value={takeProfit} onChangeText={setTakeProfit} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>

          <View style={styles.row}>
            <TextInput label="Max Cons. Losses" value={maxLosses} onChangeText={setMaxLosses} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
            <TextInput label="Max Trades" value={maxTrades} onChangeText={setMaxTrades} mode="outlined" style={[styles.input, styles.half]} keyboardType="numeric" />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        {!status?.active ? (
          <Button 
            mode="contained" 
            onPress={handleStart} 
            loading={loading} 
            style={styles.startButton}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
            icon="play-circle"
          >
            Start Auto Trade
          </Button>
        ) : (
          <Button 
            mode="contained" 
            onPress={handleStop} 
            loading={loading} 
            buttonColor={theme.colors.error} 
            style={styles.stopButton}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
            icon="stop-circle"
          >
            Stop Trading
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 16 },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  buttonContainer: { marginTop: 10, marginBottom: 40 },
  startButton: { borderRadius: 12 },
  stopButton: { borderRadius: 12 },
  dashboardCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00E676'
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    alignItems: 'center',
  }
});
