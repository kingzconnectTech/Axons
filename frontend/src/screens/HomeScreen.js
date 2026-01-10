import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Welcome to Axon</Text>
      
      <View style={styles.buttonContainer}>
        <Card style={styles.card} onPress={() => navigation.navigate('Signals')}>
          <Card.Content>
            <Text variant="titleLarge">Signals</Text>
            <Text variant="bodyMedium">Analyze market and get trading signals</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} onPress={() => navigation.navigate('AutoTrade')}>
          <Card.Content>
            <Text variant="titleLarge">Auto Trade</Text>
            <Text variant="bodyMedium">Automate your trading strategies</Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 20,
  },
  card: {
    marginBottom: 20,
  }
});
