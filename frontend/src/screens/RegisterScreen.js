import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, HelperText } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import ParticlesBackground from '../components/ParticlesBackground';
import AnimatedBorderButton from '../components/AnimatedBorderButton';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // DOB States
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateAge = () => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return false;

    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    
    // Check if date is valid (e.g. 31st Feb)
    if (birthDate.getDate() !== d || birthDate.getMonth() + 1 !== m || birthDate.getFullYear() !== y) {
      return false;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !day || !month || !year) {
      setError('Please fill in all fields');
      return;
    }

    const age = validateAge();
    if (age === false) {
      setError('Please enter a valid date of birth');
      return;
    }

    if (age < 18) {
      setError('You must be at least 18 years old to register.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      await userCredential.user.updateProfile({
        displayName: name,
      });
      
      // Save extra profile info locally
      const dob = `${day}/${month}/${year}`;
      await AsyncStorage.setItem(`user_dob_${userCredential.user.uid}`, dob);
      
      // Navigation handled by App.js auth listener
    } catch (e) {
      console.log(e);
      if (e.code === 'auth/email-already-in-use') setError('That email address is already in use!');
      else if (e.code === 'auth/invalid-email') setError('That email address is invalid!');
      else if (e.code === 'auth/weak-password') setError('Password should be at least 6 characters');
      else setError(`Registration failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.secondaryContainer, theme.colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={styles.backgroundGradient}
      />
      <ParticlesBackground />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Surface style={[styles.card, { backgroundColor: theme.dark ? '#1F2636' : '#FFFFFF' }]} elevation={4}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.secondary, fontSize: responsiveFontSize(28) }]}>
              Create Account
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: responsiveFontSize(14) }]}>
              Join AXON Trading Assistant
            </Text>

            <View style={styles.form}>
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { outline: theme.colors.outline } }}
                left={<TextInput.Icon icon="account" color={theme.colors.onSurfaceVariant} />}
              />

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

              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, marginBottom: 8 }}>
                Date of Birth
              </Text>
              <View style={styles.dobRow}>
                <TextInput
                  label="DD"
                  value={day}
                  onChangeText={setDay}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.input, styles.dobInput]}
                  theme={{ colors: { outline: theme.colors.outline } }}
                />
                <TextInput
                  label="MM"
                  value={month}
                  onChangeText={setMonth}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.input, styles.dobInput]}
                  theme={{ colors: { outline: theme.colors.outline } }}
                />
                <TextInput
                  label="YYYY"
                  value={year}
                  onChangeText={setYear}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  style={[styles.input, styles.dobInputYear]}
                  theme={{ colors: { outline: theme.colors.outline } }}
                />
              </View>

              {error ? (
                <HelperText type="error" visible={!!error} style={{ textAlign: 'center' }}>
                  {error}
                </HelperText>
              ) : null}

              <AnimatedBorderButton
                containerStyle={{ marginTop: 24 }}
                borderRadius={12}
                colors={[theme.colors.secondary, '#FFFFFF', theme.colors.secondary]}
                duration={loading ? 500 : 2000}
              >
                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.button}
                  labelStyle={styles.buttonLabel}
                  buttonColor={theme.colors.secondary}
                >
                  REGISTER
                </Button>
              </AnimatedBorderButton>

              <View style={styles.footer}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Surface>
        </ScrollView>
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
    padding: normalize(20),
  },
  card: {
    padding: normalize(24),
    borderRadius: normalize(24),
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: normalize(8),
  },
  subtitle: {
    marginBottom: normalize(32),
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: normalize(16),
    backgroundColor: 'transparent',
  },
  dobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(8),
  },
  dobInput: {
    width: '28%',
    textAlign: 'center',
  },
  dobInputYear: {
    width: '38%',
    textAlign: 'center',
  },
  button: {
    borderRadius: normalize(10),
    paddingVertical: normalize(6),
    elevation: 0,
  },
  buttonLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
    letterSpacing: normalize(1),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: normalize(24),
  },
});
