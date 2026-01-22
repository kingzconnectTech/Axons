import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, HelperText } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import ParticlesBackground from '../components/ParticlesBackground';
import AnimatedBorderButton from '../components/AnimatedBorderButton';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      // Navigation will be handled by the auth state listener in App.js
    } catch (e) {
      console.log(e);
      if (e.code === 'auth/invalid-email') setError('Invalid email address');
      else if (e.code === 'auth/user-disabled') setError('User account is disabled');
      else if (e.code === 'auth/user-not-found') setError('User not found');
      else if (e.code === 'auth/wrong-password') setError('Incorrect password');
      else setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={styles.backgroundGradient}
      />
      <ParticlesBackground />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Surface style={[styles.card, { backgroundColor: theme.dark ? '#1F2636' : '#FFFFFF' }]} elevation={4}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Sign in to continue to AXON
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              theme={{ colors: { outline: theme.colors.outline } }}
              left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              theme={{ colors: { outline: theme.colors.outline } }}
              left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
            />

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <AnimatedBorderButton
              containerStyle={{ marginTop: 24 }}
              borderRadius={12}
              colors={[theme.colors.primary, '#FFFFFF', theme.colors.primary]}
            >
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
                labelStyle={styles.buttonLabel}
              >
                LOGIN
              </Button>
            </AnimatedBorderButton>

            <View style={styles.footer}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 6,
    elevation: 0,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
