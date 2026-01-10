import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Button, Text, Card, Avatar, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineLarge" style={[styles.welcomeText, { color: theme.colors.onBackground }]}>
          Welcome Back
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Ready to dominate the market?
        </Text>
      </View>
      
      <View style={styles.gridContainer}>
        {/* Signals Module */}
        <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card mode="contained" style={styles.card} onPress={() => navigation.navigate('Signals')}>
            <View style={styles.cardInner}>
              <Avatar.Icon 
                size={56} 
                icon="chart-line-variant" 
                style={{ backgroundColor: theme.colors.primaryContainer }} 
                color={theme.colors.primary}
              />
              <View style={styles.cardContent}>
                <Text variant="titleLarge" style={styles.cardTitle}>Signals</Text>
                <Text variant="bodySmall" style={styles.cardDesc}>AI-Powered Market Analysis</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          </Card>
        </Surface>

        {/* Auto Trade Module */}
        <Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card mode="contained" style={styles.card} onPress={() => navigation.navigate('AutoTrade')}>
            <View style={styles.cardInner}>
              <Avatar.Icon 
                size={56} 
                icon="robot-industrial" 
                style={{ backgroundColor: theme.colors.secondaryContainer }} 
                color={theme.colors.secondary}
              />
              <View style={styles.cardContent}>
                <Text variant="titleLarge" style={styles.cardTitle}>Auto Trade</Text>
                <Text variant="bodySmall" style={styles.cardDesc}>Automated Strategy Execution</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          </Card>
        </Surface>
      </View>

      {/* Quick Stats / Info Placeholder */}
      <View style={styles.statsContainer}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 10 }}>Market Overview</Text>
        <View style={styles.statRow}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>EUR/USD</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>1.0823</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>+0.05%</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>GBP/USD</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>1.2745</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>-0.12%</Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  welcomeText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gridContainer: {
    gap: 20,
    marginBottom: 40,
  },
  surface: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'transparent',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  cardDesc: {
    opacity: 0.7,
  },
  statsContainer: {
    marginTop: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 15,
  },
  statCard: {
    flex: 1,
  }
});
