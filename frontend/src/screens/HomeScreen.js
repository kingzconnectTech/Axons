import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Surface, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { API_URLS } from '../config';

const { width } = Dimensions.get('window');

const MOCK_CHART_DATA = {
  labels: ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"],
  datasets: [
    {
      data: [1.0820, 1.0825, 1.0822, 1.0830, 1.0828, 1.0835],
      color: (opacity = 1) => `rgba(0, 209, 255, ${opacity})`, // Cyber Blue
      strokeWidth: 2
    }
  ]
};

const CHART_CONFIG = {
  backgroundGradientFrom: "#161B29",
  backgroundGradientTo: "#161B29",
  decimalPlaces: 4,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#00D1FF"
  }
};

const QuickActionCard = ({ title, subtitle, icon, color, onPress, badge, status }) => {
  const theme = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={['#252D40', '#161B29']}
          style={[styles.actionCard, { borderTopColor: color }]}
        >
          {/* Background Watermark */}
          <View style={{ position: 'absolute', bottom: -15, right: -15, opacity: 0.05 }}>
             <MaterialCommunityIcons name={icon} size={100} color={color} />
          </View>

          <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                  <MaterialCommunityIcons name={icon} size={28} color={color} />
              </View>
              {badge && (
                  <Surface style={[styles.badge, { backgroundColor: color }]} elevation={2}>
                      <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>{badge}</Text>
                  </Surface>
              )}
              {status === 'active' && (
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.secondary, shadowColor: theme.colors.secondary, shadowRadius: 4, shadowOpacity: 0.8 }]} />
              )}
          </View>

          <View style={{ marginTop: 20 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}>{title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '500' }}>{subtitle}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={color} style={{ marginLeft: 6 }} />
              </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const Particle = () => {
  const anim = React.useRef(new Animated.Value(0)).current;
  const randomDelay = Math.random() * 2000;
  const duration = Math.random() * 3000 + 4000;
  
  // Random static position
  const left = `${Math.random() * 100}%`;
  const top = `${Math.random() * 100}%`;
  const size = Math.random() * 4 + 2; // 2-6px

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(anim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30] // Float up 30px
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.6, 0.2]
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
        transform: [{ translateY }],
        opacity
      }}
    />
  );
};

const ParticlesBackground = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(25)].map((_, i) => (
        <Particle key={i} />
      ))}
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const [prices, setPrices] = useState({
    'EURUSD-OTC': 1.0835,
    'GBPUSD-OTC': 1.2745,
    'USDJPY-OTC': 145.20,
    'NZDUSD-OTC': 0.6120
  });

  // Live Market Fetch
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get(`${API_URLS.MARKET}/prices?pairs=EURUSD-OTC,GBPUSD-OTC,USDJPY-OTC,NZDUSD-OTC`);
        // Only update if we got valid data
        if (response.data && Object.keys(response.data).length > 0) {
           setPrices(response.data);
        }
      } catch (error) {
        console.log("Market fetch error:", error.message);
      }
    };

    fetchPrices(); // Initial fetch
    const interval = setInterval(fetchPrices, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const PriceCard = ({ pair, price, change }) => (
    <Surface style={[styles.priceCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <View style={styles.priceRow}>
        <View>
           <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>{pair}</Text>
           <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>{price.toFixed(pair.includes('JPY') ? 2 : 4)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
           <MaterialCommunityIcons name={change >= 0 ? "trending-up" : "trending-down"} size={20} color={change >= 0 ? theme.colors.secondary : theme.colors.error} />
           <Text variant="bodySmall" style={{ color: change >= 0 ? theme.colors.secondary : theme.colors.error }}>
             {change >= 0 ? '+' : ''}{change.toFixed(2)}%
           </Text>
        </View>
      </View>
    </Surface>
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
        </View>
      </LinearGradient>

      {/* Live Ticker */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Live Market</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerContainer}>
          <PriceCard pair="EUR/USD-OTC" price={prices['EURUSD-OTC']} change={0.05} />
          <PriceCard pair="GBP/USD-OTC" price={prices['GBPUSD-OTC']} change={-0.12} />
          <PriceCard pair="USD/JPY-OTC" price={prices['USDJPY-OTC']} change={0.23} />
          <PriceCard pair="NZD/USD-OTC" price={prices['NZDUSD-OTC']} change={0.15} />
        </ScrollView>
      </View>

      {/* Chart Section */}
      <View style={styles.section}>
         <View style={styles.rowBetween}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Market Trend</Text>
            <Button mode="text" compact textColor={theme.colors.primary}>View All</Button>
         </View>
         <LineChart
            data={MOCK_CHART_DATA}
            width={width - 32} // from react-native
            height={180}
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

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Quick Actions</Text>
        <View style={styles.gridContainer}>
          {/* Signals Action */}
          <QuickActionCard 
            title="SIGNALS" 
            subtitle="AI Analysis" 
            icon="radar" 
            color={theme.colors.primary} 
            onPress={() => navigation.navigate('Signals')}
            badge="3 NEW"
          />

          {/* Auto Trade Action */}
          <QuickActionCard 
            title="AUTO TRADE" 
            subtitle="Bot Idle" 
            icon="robot" 
            color={theme.colors.secondary} 
            onPress={() => navigation.navigate('AutoTrade')}
            status="idle"
          />
        </View>
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
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tickerContainer: {
    paddingRight: 16,
    gap: 12,
  },
  priceCard: {
    padding: 12,
    borderRadius: 12,
    width: 140,
    marginRight: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  actionCard: {
    padding: 16,
    borderRadius: 24,
    minHeight: 150,
    justifyContent: 'space-between',
    borderLeftWidth: 0,
    borderTopWidth: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
