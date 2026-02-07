import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Colors from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: February 2025</Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          Penny ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.subTitle}>Account Information</Text>
        <Text style={styles.paragraph}>
          When you create an account, we collect your email address and display name. If you sign in with Google or Apple, we receive basic profile information from those services.
        </Text>

        <Text style={styles.subTitle}>Financial Data</Text>
        <Text style={styles.paragraph}>
          Your portfolio holdings, account balances, and financial information are stored locally on your device. We do not upload, store, or have access to your personal financial data on our servers.
        </Text>

        <Text style={styles.subTitle}>Usage Data</Text>
        <Text style={styles.paragraph}>
          We collect anonymous usage statistics to improve the App, including features used, app crashes, and general usage patterns. This data cannot be used to identify you personally.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:{'\n'}
          {'\n'}- Provide and maintain the App
          {'\n'}- Process your subscription payments
          {'\n'}- Send important notifications about your account
          {'\n'}- Improve and optimize the App experience
          {'\n'}- Respond to customer support requests
        </Text>

        <Text style={styles.sectionTitle}>Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your financial data is stored encrypted on your device using industry-standard encryption. We use secure HTTPS connections for all network communications. Your data is never sold to third parties.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use the following third-party services:{'\n'}
          {'\n'}- RevenueCat for subscription management
          {'\n'}- Google Analytics for anonymous usage analytics
          {'\n'}- Financial data APIs for price information
          {'\n'}
          {'\n'}Each of these services has their own privacy policy governing their use of your data.
        </Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:{'\n'}
          {'\n'}- Access your personal data
          {'\n'}- Delete your account and all associated data
          {'\n'}- Export your data
          {'\n'}- Opt out of marketing communications
          {'\n'}- Request correction of inaccurate data
        </Text>

        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your account information for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal purposes.
        </Text>

        <Text style={styles.sectionTitle}>Children's Privacy</Text>
        <Text style={styles.paragraph}>
          The App is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
        </Text>

        <Text style={styles.sectionTitle}>Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the App and updating the "Last Updated" date.
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy or our data practices, please contact us at:{'\n'}
          {'\n'}Email: privacy@getpenny.app
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
