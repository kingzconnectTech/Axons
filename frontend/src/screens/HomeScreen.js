import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';

import ParticlesBackground from '../components/ParticlesBackground';
import { API_URLS } from '../config';
import { useBot } from '../context/BotContext';

const { width } = Dimensions.get('window');

const MOCK_CHART_DATA = {
  labels: ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"],
  datasets: [
    {
      data: [1.0830, 1.0835, 1.0832, 1.0838, 1.0834, 1.0836],
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
      strokeWidth: 2
    }
  ]
};

const CHART_CONFIG = {
  backgroundGradientFrom: "transparent",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "transparent",
  backgroundGradientToOpacity: 0,
  decimalPlaces: 4,
  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(150, 150, 150, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#2196f3"
  }
};

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { isBotRunning } = useBot();
  const [prices, setPrices] = useState({
    'EURUSD-OTC': { price: 1.0835, change: 0.05 },
    'GBPUSD-OTC': { price: 1.2745, change: -0.12 },
    'EURJPY-OTC': { price: 157.50, change: 0.15 },
    'AUDCAD-OTC': { price: 0.8950, change: 0.10 }
  });

  // Live Market Fetch
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get(`${API_URLS.MARKET}/prices?pairs=EURUSD-OTC,GBPUSD-OTC,EURJPY-OTC,AUDCAD-OTC`);
        if (response.data && Object.keys(response.data).length > 0) {
           setPrices(response.data);
        }
      } catch (error) {
        // Silently fail or log for debugging
        // console.log("Market fetch error:", error.message);
      }
    };

    fetchPrices(); // Initial fetch
    const interval = setInterval(fetchPrices, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const PriceCard = ({ pair, data }) => {
    const price = data?.price || 0;
    const change = data?.change || 0;
    const isPositive = change >= 0;
    
    return (
    <Surface style={[styles.priceCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <View style={styles.priceRow}>
        <View>
           <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>{pair}</Text>
           <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 4, fontWeight: 'bold' }}>
             {price.toFixed(pair.includes('JPY') ? 2 : 5)}
           </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' }}>
           <MaterialCommunityIcons 
             name={isPositive ? "trending-up" : "trending-down"} 
             size={16} 
             color={isPositive ? theme.colors.secondary : theme.colors.error} 
             style={{ marginRight: 4 }}
           />
           <Text variant="bodyMedium" style={{ color: isPositive ? theme.colors.secondary : theme.colors.error, fontWeight: 'bold' }}>
             {isPositive ? '+' : ''}{change.toFixed(2)}%
           </Text>
        </View>
      </View>
    </Surface>
  )};

  const QuickActionCard = ({ title, icon, route, color, badge }) => (
    <TouchableOpacity onPress={() => navigation.navigate(route)} style={{ flex: 1 }}>
      <Surface style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <LinearGradient
            colors={[color + '20', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        />
        <MaterialCommunityIcons name={icon} size={32} color={color} />
        <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: 'bold', color: theme.colors.onSurface }}>{title}</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={theme.colors.onSurfaceVariant} style={{ position: 'absolute', bottom: 12, right: 12 }} />
        
        {badge && (
          <View style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            backgroundColor: badge.color, 
            paddingHorizontal: 8, 
            paddingVertical: 2, 
            borderRadius: 10,
            zIndex: 10
          }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{badge.text}</Text>
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      
      {/* Header Gradient */}
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        <ParticlesBackground />
        <View style={styles.headerContent}>
          <View>
            <Text variant="displaySmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900', letterSpacing: 4 }}>AXON</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.primary, letterSpacing: 1, marginTop: 4, fontWeight: 'bold' }}>ALGORITHMIC TRADING</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: 8, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 20 }}
          >
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Live Ticker */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Live Market</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerContainer}>
          <PriceCard pair="EUR/USD-OTC" data={prices['EURUSD-OTC']} />
          <PriceCard pair="GBP/USD-OTC" data={prices['GBPUSD-OTC']} />
          <PriceCard pair="EUR/JPY-OTC" data={prices['EURJPY-OTC']} />
          <PriceCard pair="AUD/CAD-OTC" data={prices['AUDCAD-OTC']} />
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Quick Actions</Text>
        <View style={styles.row}>
            <QuickActionCard title="Signals" icon="radar" route="Signals" color="#2196f3" />
            <View style={{ width: 16 }} />
            <QuickActionCard 
              title="Auto Trade" 
              icon="robot" 
              route="AutoTrade" 
              color="#4caf50" 
              badge={isBotRunning ? { text: 'RUNNING', color: '#4caf50' } : null}
            />
            <View style={{ width: 16 }} />
            <QuickActionCard title="Quick" icon="flash" route="Quick" color="#FF9800" />
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.section}>
         <View style={styles.rowBetween}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Market Trend</Text>
            <Button mode="text" compact textColor={theme.colors.primary}>View All</Button>
         </View>
         <LineChart
            data={MOCK_CHART_DATA}
            width={width - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={CHART_CONFIG}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
      </View>
      
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    overflow: 'hidden', // for particles
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tickerContainer: {
    paddingRight: 16,
  },
  priceCard: {
    width: 160,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  priceRow: {
    justifyContent: 'space-between',
    height: 60,
  },
  actionCard: {
    padding: 16,
    borderRadius: 16,
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
