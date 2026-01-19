import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Vibration, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Text, Surface, useTheme, Button, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';
import AdBanner from '../components/AdBanner';

const { width } = Dimensions.get('window');
const SCAN_ACCENT = '#3d0dadff';
const SCAN_ACCENT_DARK = '#1c0472ff';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function QuickScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPair, setSelectedPair] = useState('EURUSD-OTC');
  const [modalVisible, setModalVisible] = useState(false);
  const [scanAnim] = useState(new Animated.Value(0));
  const scanLoop = useRef(null);

  const pairs = [
    { label: 'EUR/USD OTC', value: 'EURUSD-OTC' },
    { label: 'GBP/USD OTC', value: 'GBPUSD-OTC' },
    { label: 'EUR/JPY OTC', value: 'EURJPY-OTC' },
    { label: 'AUD/CAD OTC', value: 'AUDCAD-OTC' },
    { label: 'EUR/USD', value: 'EURUSD' },
    { label: 'EUR/GBP', value: 'EURGBP' },
    { label: 'AUD/USD', value: 'AUDUSD' },
    { label: 'USD/JPY', value: 'USDJPY' },
    { label: 'GBP/USD', value: 'GBPUSD' },
    { label: 'USD/CHF', value: 'USDCHF' },
    { label: 'EUR/JPY', value: 'EURJPY' },
    { label: 'GBP/JPY', value: 'GBPJPY' },
    { label: 'USD/CAD', value: 'USDCAD' },
  ];

  const popularPairs = [
    { label: 'EUR/USD OTC', value: 'EURUSD-OTC' },
    { label: 'GBP/USD OTC', value: 'GBPUSD-OTC' },
    { label: 'EUR/JPY OTC', value: 'EURJPY-OTC' },
    { label: 'AUD/CAD OTC', value: 'AUDCAD-OTC' },
  ];

  useEffect(() => {
    if (loading) {
      scanAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.current = loop;
      loop.start();
    } else {
      if (scanLoop.current) {
        scanLoop.current.stop();
        scanLoop.current = null;
      }
    }
  }, [loading, scanAnim]);

  const pulseScale = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowOpacity = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const handleAnalyze = async () => {
    Vibration.vibrate(50); // Haptic feedback start
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(`${API_URLS.SIGNALS}/analyze`, {
        pair: selectedPair,
        timeframe: 1,
        strategy: 'Quick 2M Strategy'
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setResult(response.data);
      if (response.data.action !== 'NEUTRAL') {
          Vibration.vibrate([0, 50, 100, 50]); // Double tap on signal
      } else {
          Vibration.vibrate(50);
      }
    } catch (error) {
      console.error("Quick Analysis Error:", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action === 'CALL') return '#00E676'; // Bright Green
    if (action === 'PUT') return '#FF1744'; // Bright Red
    return theme.colors.onSurfaceVariant;
  };

  const getActionIcon = (action) => {
    if (action === 'CALL') return 'arrow-up-bold';
    if (action === 'PUT') return 'arrow-down-bold';
    return 'minus';
  };

  const ConfidenceMeter = ({ value, color }) => (
    <View style={styles.meterContainer}>
      <View style={styles.meterBackground}>
        <View style={[styles.meterFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.meterText, { color: color }]}>{value}% CONFIDENCE</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#3E1E68', theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={styles.headerGradient}
      >
        <ParticlesBackground />
        <View style={styles.headerContent}>
          <Text variant="headlineMedium" style={styles.headerTitle}>AXON TRADING ASSISTANT</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>FLASH SCAN</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Popular Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {popularPairs.map((p) => (
                <Chip 
                    key={p.value} 
                    selected={selectedPair === p.value}
                    onPress={() => setSelectedPair(p.value)}
                    style={[styles.chip, selectedPair === p.value && { backgroundColor: SCAN_ACCENT }]}
                    textStyle={{ color: selectedPair === p.value ? SCAN_ACCENT_DARK : theme.colors.onSurface }}
                    mode="outlined"
                >
                    {p.label}
                </Chip>
            ))}
            <Chip 
                icon="dots-horizontal" 
                onPress={() => setModalVisible(true)}
                style={styles.chip}
                mode="outlined"
            >
                More
            </Chip>
        </ScrollView>

        {/* Asset Selection Card */}
        <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.9}>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
             <View style={styles.cardInner}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 226, 175, 0.15)' }]}>
                   <MaterialCommunityIcons name="currency-usd" size={32} color={SCAN_ACCENT_DARK} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                   <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 1 }}>SELECTED ASSET</Text>
                   <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                      {pairs.find(p => p.value === selectedPair)?.label || selectedPair}
                   </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={28} color={theme.colors.onSurfaceVariant} />
             </View>
          </Surface>
        </TouchableOpacity>

        {/* Analyze Button */}
        <View style={styles.actionContainer}>
           <TouchableOpacity 
              onPress={handleAnalyze} 
              disabled={loading}
              activeOpacity={0.9}
           >
              <Animated.View
                style={[
                  styles.analyzeButton,
                  {
                    backgroundColor: '#5D2F77',
                    transform: [{ scale: loading ? pulseScale : 1 }],
                    opacity: loading ? glowOpacity : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="lightning-bolt" size={24} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>SCAN NOW</Text>
                  </View>
                )}
              </Animated.View>
           </TouchableOpacity>
           
           <Surface style={styles.instructionCard} elevation={1}>
              <MaterialCommunityIcons name="information" size={20} color={SCAN_ACCENT_DARK} />
              <Text style={styles.instructionText}>
                 For best accuracy, scan twice to confirm the signal.
              </Text>
           </Surface>
        </View>

        {/* Result Section */}
        {result && (
          <Surface style={[styles.resultCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <LinearGradient
              colors={[getActionColor(result.action) + '10', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.resultHeader}>
              <View style={[styles.badge, { backgroundColor: getActionColor(result.action) + '20' }]}>
                 <Text style={{ color: getActionColor(result.action), fontWeight: '900', letterSpacing: 1 }}>
                    {result.action === 'NEUTRAL' ? 'WAIT' : 'SIGNAL FOUND'}
                 </Text>
              </View>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                 {new Date(result.timestamp * 1000).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.mainResult}>
               <MaterialCommunityIcons 
                  name={getActionIcon(result.action)} 
                  size={64} 
                  color={getActionColor(result.action)} 
               />
               <Text style={[styles.actionText, { color: getActionColor(result.action) }]}>
                  {result.action === 'NEUTRAL' ? 'NO SIGNAL' : result.action}
               </Text>
               <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  2 Minute Expiry Recommended
               </Text>
            </View>

            <ConfidenceMeter value={result.confidence} color={getActionColor(result.action)} />
            
            <View style={styles.strategyInfo}>
               <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
               <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginLeft: 6, flex: 1 }}>
                  {result.reason || 'Based on Trend Momentum (3 Candles)'}
               </Text>
            </View>

            {/* Scan Again Hint */}
            <TouchableOpacity onPress={handleAnalyze} style={{ marginTop: 20, alignItems: 'center' }}>
               <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>SCAN AGAIN</Text>
            </TouchableOpacity>
          </Surface>
        )}
      </ScrollView>

      <AdBanner />

      <SelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Select Asset Pair"
        options={pairs}
        value={selectedPair}
        onSelect={setSelectedPair}
        icon="chart-line"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    color: 'white',
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chip: {
    marginRight: 8,
    borderRadius: 20,
  },
  card: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardInner: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'stretch',
    marginBottom: 32,
  },
  analyzeButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#6a00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resultCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mainResult: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  meterContainer: {
    marginBottom: 20,
  },
  meterBackground: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  meterFill: {
    height: '100%',
    borderRadius: 6,
  },
  meterText: {
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 12,
  },
  strategyInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#3700ffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 175, 0.7)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  }
});
