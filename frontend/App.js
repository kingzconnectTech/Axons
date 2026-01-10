import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import HomeScreen from './src/screens/HomeScreen';
import SignalsScreen from './src/screens/SignalsScreen';
import AutoTradeScreen from './src/screens/AutoTradeScreen';

const Stack = createStackNavigator();

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavDarkTheme, // Force dark for this pro look
  reactNavigationDark: NavDarkTheme,
});

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00D1FF', // Cyber Blue
    onPrimary: '#003344',
    primaryContainer: '#004F66',
    onPrimaryContainer: '#B8EAFF',
    secondary: '#00E676', // Success Green
    onSecondary: '#00391A',
    secondaryContainer: '#005226',
    onSecondaryContainer: '#99F6C0',
    tertiary: '#FF4081', // Accent Pink/Red
    onTertiary: '#660026',
    tertiaryContainer: '#93003A',
    onTertiaryContainer: '#FFD9E2',
    background: '#0A0E17', // Very Dark Blue/Black
    surface: '#161B29', // Slightly Lighter Card BG
    onSurface: '#E1E2E6',
    error: '#FF5252',
    elevation: {
      level0: 'transparent',
      level1: '#1F2636',
      level2: '#242C3D',
      level3: '#293345',
      level4: '#2E394C',
      level5: '#334054',
    },
  },
  roundness: 12,
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            cardStyle: { backgroundColor: theme.colors.background }
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AXON' }} />
          <Stack.Screen name="Signals" component={SignalsScreen} options={{ title: 'Market Signals' }} />
          <Stack.Screen name="AutoTrade" component={AutoTradeScreen} options={{ title: 'Auto Trader' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
