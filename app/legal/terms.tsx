import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Colors from '@/constants/colors';

export default function TermsOfUseScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: February 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using Penny ("the App"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Penny is a portfolio aggregation and intelligence platform designed to help users track and analyze their investments across multiple accounts and asset classes. The App provides tools for visualization, analysis, and educational purposes only.
        </Text>

        <Text style={styles.sectionTitle}>3. Not Financial Advice</Text>
        <Text style={styles.paragraph}>
          The information provided by Penny is for informational and educational purposes only. It should not be considered financial, investment, tax, or legal advice. Always consult with a qualified financial advisor before making investment decisions.
        </Text>

        <Text style={styles.sectionTitle}>4. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>5. Subscription and Payments</Text>
        <Text style={styles.paragraph}>
          Penny offers both free and premium subscription tiers. Premium subscriptions are billed through the App Store or Google Play. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can manage and cancel subscriptions in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>6. User Data</Text>
        <Text style={styles.paragraph}>
          Your financial data is stored securely on your device. We do not have access to your portfolio holdings, account balances, or personal financial information unless you explicitly share it with our support team for troubleshooting purposes.
        </Text>

        <Text style={styles.sectionTitle}>7. Accuracy of Information</Text>
        <Text style={styles.paragraph}>
          While we strive to provide accurate price data and calculations, we cannot guarantee the accuracy, completeness, or timeliness of any information displayed in the App. Price data may be delayed and should not be used for trading decisions.
        </Text>

        <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          All content, features, and functionality of the App are owned by Penny and are protected by international copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={styles.sectionTitle}>9. Prohibited Uses</Text>
        <Text style={styles.paragraph}>
          You agree not to use the App for any unlawful purpose, to attempt to gain unauthorized access to our systems, to transmit malware, or to interfere with other users' enjoyment of the App.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, Penny shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses resulting from your use of the App.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. We will notify users of significant changes through the App or via email. Continued use of the App after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms of Use, please contact us at support@getpenny.app
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
  paragraph: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
