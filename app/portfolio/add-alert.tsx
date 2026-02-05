import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Holding, PriceAlert } from '@/types';
import {
  addAlert,
  createPriceAlert,
  createDateAlert,
  requestNotificationPermissions,
} from '@/lib/alertService';
import portfolioService from '@/lib/portfolioService';

type AlertType = 'price_above' | 'price_below' | 'maturity' | 'reminder';

const ALERT_TYPES: { type: AlertType; label: string; description: string; icon: any }[] = [
  {
    type: 'price_above',
    label: 'Price Above',
    description: 'Notify when price rises above target',
    icon: TrendingUp,
  },
  {
    type: 'price_below',
    label: 'Price Below',
    description: 'Notify when price falls below target',
    icon: TrendingDown,
  },
  {
    type: 'maturity',
    label: 'Maturity Date',
    description: 'Reminder for maturity or expiry dates',
    icon: Calendar,
  },
  {
    type: 'reminder',
    label: 'Custom Reminder',
    description: 'Set a custom reminder for any date',
    icon: Clock,
  },
];

export default function AddAlertScreen() {
  const router = useRouter();
  const { holdingId } = useLocalSearchParams<{ holdingId?: string }>();

  const [holding, setHolding] = useState<Holding | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    if (holdingId) {
      loadHolding();
    }
  }, [holdingId]);

  const loadHolding = async () => {
    try {
      const holdings = await portfolioService.getHoldings();
      const found = holdings.find((h) => h.id === holdingId);
      setHolding(found || null);

      // Pre-fill current price for price alerts
      if (found) {
        const currentPrice = found.currentPrice || found.purchasePrice;
        setTargetPrice(currentPrice.toFixed(2));
      }
    } catch (error) {
      console.error('Failed to load holding:', error);
    }
  };

  const isPriceAlert = alertType === 'price_above' || alertType === 'price_below';
  const isDateAlert = alertType === 'maturity' || alertType === 'reminder';

  const validateForm = () => {
    if (!alertType) {
      Alert.alert('Select Alert Type', 'Please choose an alert type.');
      return false;
    }

    if (isPriceAlert) {
      if (!holding) {
        Alert.alert('No Holding', 'Price alerts require a holding.');
        return false;
      }
      if (!targetPrice || parseFloat(targetPrice) <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid target price.');
        return false;
      }
    }

    if (isDateAlert) {
      if (!targetDate) {
        Alert.alert('Date Required', 'Please enter a target date.');
        return false;
      }
      if (!message.trim()) {
        Alert.alert('Message Required', 'Please enter a reminder message.');
        return false;
      }
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let alert: PriceAlert;

      if (isPriceAlert && holding) {
        alert = createPriceAlert(
          holding.id,
          holding.name,
          alertType as 'price_above' | 'price_below',
          parseFloat(targetPrice)
        );
      } else {
        alert = createDateAlert(
          holdingId,
          alertType as 'maturity' | 'reminder',
          targetDate,
          message.trim()
        );
      }

      await addAlert(alert);
      router.back();
    } catch (error) {
      console.error('Failed to create alert:', error);
      Alert.alert('Error', 'Failed to create alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Alert</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Holding Info */}
        {holding && (
          <View style={styles.holdingCard}>
            <Text style={styles.holdingLabel}>Alert for</Text>
            <Text style={styles.holdingName}>{holding.name}</Text>
            {holding.symbol && (
              <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
            )}
            <Text style={styles.holdingPrice}>
              Current: ${(holding.currentPrice || holding.purchasePrice).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Alert Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Type</Text>
          <View style={styles.typeGrid}>
            {ALERT_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = alertType === item.type;
              // Hide price alerts if no holding
              if (!holding && (item.type === 'price_above' || item.type === 'price_below')) {
                return null;
              }
              return (
                <Pressable
                  key={item.type}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  onPress={() => setAlertType(item.type)}
                >
                  {isSelected && (
                    <View style={styles.checkMark}>
                      <Check size={14} color={Colors.textLight} />
                    </View>
                  )}
                  <View style={[styles.typeIcon, isSelected && styles.typeIconSelected]}>
                    <Icon
                      size={24}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={styles.typeDescription}>{item.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Price Input (for price alerts) */}
        {isPriceAlert && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Price</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={targetPrice}
                onChangeText={setTargetPrice}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.inputHint}>
              {alertType === 'price_above'
                ? 'You\'ll be notified when the price rises above this value'
                : 'You\'ll be notified when the price falls below this value'}
            </Text>
          </View>
        )}

        {/* Date & Message Input (for date alerts) */}
        {isDateAlert && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={targetDate}
                onChangeText={setTargetDate}
              />
              <Text style={styles.inputHint}>
                Enter the date in YYYY-MM-DD format (e.g., 2024-12-31)
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  alertType === 'maturity'
                    ? 'e.g., Fixed deposit matures'
                    : 'e.g., Review portfolio allocation'
                }
                placeholderTextColor={Colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            (!alertType || isSubmitting) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!alertType || isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? 'Creating...' : 'Create Alert'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  holdingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  holdingLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  holdingName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingSymbol: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  holdingPrice: {
    fontSize: 14,
    color: Colors.accent,
    marginTop: 8,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },

  typeGrid: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  checkMark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconSelected: {
    backgroundColor: Colors.primaryLight + '20',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: Colors.primary,
  },
  typeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputPrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
