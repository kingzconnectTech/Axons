import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { responsiveFontSize, normalize } from '../utils/responsive';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.dark ? [theme.colors.background, '#1F2636'] : ['#FFFFFF', '#F5F7FA']}
        style={styles.background}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            Privacy Policy
          </Text>
          
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurface }]}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            1. Introduction
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Welcome to Axon ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            2. Information We Collect
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We may collect information that you provide directly to us, such as:
            {'\n'}• Account registration details (name, email address, date of birth)
            {'\n'}• App usage data and preferences
            {'\n'}• Device information (model, OS version)
            {'\n'}• Trading configuration settings (locally stored)
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            3. How We Use Your Information
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We use the information we collect to:
            {'\n'}• Create and manage your account
            {'\n'}• Provide and maintain our services
            {'\n'}• Improve user experience and app performance
            {'\n'}• Send administrative information, such as updates and security alerts
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            4. Data Security
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We implement appropriate technical and organizational security measures to protect your personal information. However, please note that no method of transmission over the internet or electronic storage is 100% secure.
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            5. Third-Party Services
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Our app may contain links to third-party websites or services (e.g., trading brokers). We are not responsible for the privacy practices or content of these third parties. We encourage you to review their privacy policies.
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            6. Children's Privacy
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal data from a child, we will take steps to delete it.
          </Text>

          <Text variant="titleMedium" style={[styles.heading, { color: theme.colors.onSurface }]}>
            7. Contact Us
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            If you have questions or comments about this policy, please contact us through the support channels provided in the app.
          </Text>
        </Surface>
        <View style={{ height: normalize(40) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    padding: normalize(16),
  },
  card: {
    padding: normalize(20),
    borderRadius: normalize(16),
  },
  title: {
    fontWeight: 'bold',
    marginBottom: normalize(8),
    textAlign: 'center',
    fontSize: responsiveFontSize(24),
  },
  heading: {
    fontWeight: 'bold',
    marginTop: normalize(20),
    marginBottom: normalize(8),
    fontSize: responsiveFontSize(18),
  },
  paragraph: {
    lineHeight: normalize(22),
    marginBottom: normalize(4),
    fontSize: responsiveFontSize(14),
  },
});
