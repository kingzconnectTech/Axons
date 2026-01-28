import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Vibration, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Text, Surface, useTheme, Button, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URLS } from '../config';
import { responsiveFontSize, normalize } from '../utils/responsive';
import ParticlesBackground from '../components/ParticlesBackground';
import SelectionModal from '../components/SelectionModal';
import AdBanner from '../components/AdBanner';
import AnimatedBorderButton from '../components/AnimatedBorderButton';

const { width } = Dimensions.get('window');
const SCAN_ACCENT = '#264f00ff';
const SCAN_ACCENT_DARK = '#004D40';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function QuickScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPairs, setSelectedPairs] = useState(['EURUSD-OTC']);
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

  const togglePair = (pairValue) => {
    if (selectedPairs.includes(pairValue)) {
        if (selectedPairs.length > 1) {
            setSelectedPairs(selectedPairs.filter(p => p !== pairValue));
        }
    } else {
        if (selectedPairs.length < 3) {
            setSelectedPairs([...selectedPairs, pairValue]);
        } else {
            alert('Maximum 3 pairs allowed for Flash Scan');
        }
    }
  };

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
        pairs: selectedPairs,
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
        colors={['#004D40', theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={styles.headerGradient}
      >
        <ParticlesBackground />
        <View style={styles.headerContent}>
          <Text variant="headlineMedium" style={styles.headerTitle}>FLASH SCAN</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>1min Fast Trade</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Popular Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {popularPairs.map((p) => (
                <Chip 
                    key={p.value} 
                    selected={selectedPairs.includes(p.value)}
                    onPress={() => togglePair(p.value)}
                    style={[styles.chip, selectedPairs.includes(p.value) && { backgroundColor: SCAN_ACCENT }]}
                    textStyle={{ color: selectedPairs.includes(p.value) ? SCAN_ACCENT_DARK : theme.colors.onSurface }}
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
                   <MaterialCommunityIcons name="currency-usd" size={normalize(32)} color={SCAN_ACCENT_DARK} />
                </View>
                <View style={{ flex: 1, marginLeft: normalize(16) }}>
                   <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 1, fontSize: responsiveFontSize(12) }}>SELECTED ASSET</Text>
                   <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: responsiveFontSize(24) }}>
                      {!selectedPairs || selectedPairs.length === 0 ? 'Select Pairs' : (selectedPairs.length > 1 ? `${selectedPairs.length} Pairs Selected` : (pairs.find(p => p.value === selectedPairs[0])?.label || selectedPairs[0] || ''))}
                   </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={normalize(28)} color={theme.colors.onSurfaceVariant} />
             </View>
          </Surface>
        </TouchableOpacity>

        {/* Analyze Button */}
        <View style={styles.actionContainer}>
           <AnimatedBorderButton
              borderRadius={normalize(28)}
              colors={['#00E676', '#FFFFFF', '#00E676']}
              duration={loading ? 500 : 2000}
              containerStyle={{ width: '100%', elevation: 4, shadowColor: '#00E676', shadowOffset: { width: 0, height: normalize(4) }, shadowOpacity: 0.3, shadowRadius: normalize(8) }}
           >
             <TouchableOpacity 
                onPress={handleAnalyze} 
                disabled={loading}
                activeOpacity={0.9}
                style={[
                  styles.analyzeButton,
                  {
                    backgroundColor: '#004D40',
                    elevation: 0, // Remove elevation from inner button as it's on container
                    margin: 0, // Reset margin
                    width: '100%', // Ensure full width
                  }
                ]}
             >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="lightning-bolt" size={normalize(24)} color="white" style={{ marginRight: normalize(8) }} />
                    <Text style={styles.buttonText}>SCAN NOW</Text>
                  </View>
                )}
             </TouchableOpacity>
           </AnimatedBorderButton>
           
           <Surface style={styles.instructionCard} elevation={1}>
              <MaterialCommunityIcons name="information" size={normalize(20)} color={SCAN_ACCENT_DARK} />
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
              <View>
                  <View style={[styles.badge, { backgroundColor: getActionColor(result.action) + '20', alignSelf: 'flex-start' }]}>
                     <Text style={{ color: getActionColor(result.action), fontWeight: '900', letterSpacing: 1, fontSize: responsiveFontSize(14) }}>
                        {result.action === 'NEUTRAL' ? 'WAIT' : 'SIGNAL FOUND'}
                     </Text>
                  </View>
                  {result.pair && (
                      <Text style={{ color: theme.colors.onSurface, fontSize: responsiveFontSize(20), fontWeight: 'bold', marginTop: normalize(8) }}>
                          {result.pair.replace('-OTC', ' (OTC)')}
                      </Text>
                  )}
              </View>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(12) }}>
                 {new Date(result.timestamp * 1000).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.mainResult}>
               <MaterialCommunityIcons 
                  name={getActionIcon(result.action)} 
                  size={normalize(64)} 
                  color={getActionColor(result.action)} 
               />
               <Text style={[styles.actionText, { color: getActionColor(result.action) }]}>
                  {result.action === 'NEUTRAL' ? 'NO SIGNAL' : result.action}
               </Text>
               <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: normalize(4), fontSize: responsiveFontSize(14) }}>
                  1 Minute Expiry Recommended
               </Text>
            </View>

            <ConfidenceMeter value={result.confidence} color={getActionColor(result.action)} />
            
            <View style={styles.strategyInfo}>
               <MaterialCommunityIcons name="information-outline" size={normalize(16)} color={theme.colors.onSurfaceVariant} />
               <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(12), marginLeft: normalize(6), flex: 1 }}>
                  {result.reason || 'Based on RSI Direction & Candle Bias'}
               </Text>
            </View>

            {/* Scan Again Hint */}
            <TouchableOpacity onPress={handleAnalyze} style={{ marginTop: normalize(20), alignItems: 'center' }}>
               <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: responsiveFontSize(14) }}>SCAN AGAIN</Text>
            </TouchableOpacity>
          </Surface>
        )}
      </ScrollView>

      <AdBanner />

      <SelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Select Asset Pairs"
        options={pairs}
        value={selectedPairs}
        onSelect={setSelectedPairs}
        multi={true}
        maxSelect={3}
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
    paddingTop: normalize(70),
    paddingBottom: normalize(40),
    paddingHorizontal: normalize(20),
    borderBottomLeftRadius: normalize(30),
    borderBottomRightRadius: normalize(30),
    marginBottom: normalize(20),
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
    fontSize: responsiveFontSize(28),
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: normalize(4),
    fontSize: responsiveFontSize(14),
  },
  scrollContent: {
    padding: normalize(20),
    paddingBottom: normalize(40),
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: normalize(20),
  },
  chip: {
    marginRight: normalize(8),
    borderRadius: normalize(20),
  },
  card: {
    borderRadius: normalize(20),
    marginBottom: normalize(24),
    overflow: 'hidden',
  },
  cardInner: {
    padding: normalize(20),
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'stretch',
    marginBottom: normalize(32),
  },
  analyzeButton: {
    width: '100%',
    height: normalize(56),
    borderRadius: normalize(12),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resultCard: {
    borderRadius: normalize(12),
    padding: normalize(24),
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  badge: {
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(6),
    borderRadius: normalize(8),
  },
  mainResult: {
    alignItems: 'center',
    marginBottom: normalize(24),
  },
  actionText: {
    fontSize: responsiveFontSize(42),
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: normalize(8),
  },
  meterContainer: {
    marginBottom: normalize(20),
  },
  meterBackground: {
    height: normalize(12),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: normalize(6),
    overflow: 'hidden',
    marginBottom: normalize(8),
  },
  meterFill: {
    height: '100%',
    borderRadius: normalize(6),
  },
  meterText: {
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: responsiveFontSize(12),
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
    marginTop: normalize(16),
    padding: normalize(12),
    borderRadius: normalize(12),
    backgroundColor: 'rgba(0, 77, 64, 0.8)', // Dark Green transparent
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    marginLeft: normalize(10),
    flex: 1,
  }
});
