import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/context/OnboardingContext';
import { SparklineChart, generateMockChartData } from './SparklineChart';
import { sanitizeNumericInput, MAX_QUANTITY } from '@/lib/validation';

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

export function HoldingsEntryScreen({ onContinue, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedAssets, updateAssetQuantity, totalPortfolioValue } = useOnboarding();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleQuantityChange = (assetId: string, value: string) => {
    // Sanitize input: remove non-numeric chars, prevent negatives, limit max value
    const sanitized = sanitizeNumericInput(value, {
      allowDecimal: true,
      maxValue: MAX_QUANTITY,
      minValue: 0,
    });

    setQuantities(prev => ({ ...prev, [assetId]: sanitized }));

    const numValue = parseFloat(sanitized) || 0;

    // Validate and set error if needed
    if (sanitized && numValue <= 0) {
      setErrors(prev => ({ ...prev, [assetId]: 'Must be greater than 0' }));
    } else if (numValue > MAX_QUANTITY) {
      setErrors(prev => ({ ...prev, [assetId]: 'Value too large' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[assetId];
        return newErrors;
      });
    }

    updateAssetQuantity(assetId, numValue);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return price.toFixed(2);
  };

  const getUnitLabel = (type: string) => {
    switch (type) {
      case 'stock':
      case 'etf':
        return 'shares';
      case 'crypto':
        return 'coins';
      case 'gold':
      case 'silver':
      case 'platinum':
        return 'oz';
      default:
        return 'units';
    }
  };

  const allHaveQuantities = selectedAssets.every(
    asset => asset.quantity && asset.quantity > 0
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Enter Holdings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Total Value Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Portfolio Value</Text>
        <Text style={styles.totalValue}>${formatCurrency(totalPortfolioValue)}</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Position</Text>
        <Text style={[styles.tableHeaderText, styles.chartHeader]}>Chart</Text>
        <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
        <Text style={[styles.tableHeaderText, styles.valueHeader]}>Value</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {selectedAssets.map((asset) => {
          const quantity = parseFloat(quantities[asset.id] || '0') || 0;
          const value = quantity * asset.currentPrice;
          const changePercent = asset.changePercent || 0;
          const isPositive = changePercent >= 0;
          const chartData = generateMockChartData(asset.currentPrice, changePercent);

          return (
            <View key={asset.id} style={styles.assetRow}>
              {/* Asset Info */}
              <View style={styles.assetInfo}>
                <Text style={styles.assetSymbol}>{asset.symbol}</Text>
                <Text style={styles.assetPrice}>
                  ${formatPrice(asset.currentPrice)}
                </Text>
              </View>

              {/* Mini Chart */}
              <View style={styles.chartColumn}>
                <SparklineChart
                  data={chartData}
                  width={55}
                  height={26}
                  color={isPositive ? '#00D09C' : '#FF6B6B'}
                  showGradient={true}
                />
              </View>

              {/* Quantity Input */}
              <View style={styles.qtyColumn}>
                <TextInput
                  style={styles.qtyInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={quantities[asset.id] || ''}
                  onChangeText={(val) => handleQuantityChange(asset.id, val)}
                />
                <Text style={styles.unitLabel}>{getUnitLabel(asset.type)}</Text>
              </View>

              {/* Value */}
              <View style={styles.valueColumn}>
                <Text style={[
                  styles.valueText,
                  value > 0 && styles.valueTextActive
                ]}>
                  ${formatCurrency(value)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.ctaButton,
            !allHaveQuantities && styles.ctaButtonDisabled,
          ]}
          onPress={onContinue}
          disabled={!allHaveQuantities}
        >
          <Text style={[
            styles.ctaText,
            !allHaveQuantities && styles.ctaTextDisabled
          ]}>
            Review Portfolio
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  totalCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1C2333',
    borderRadius: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F1419',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartHeader: {
    width: 55,
    textAlign: 'center',
  },
  qtyHeader: {
    width: 80,
    textAlign: 'center',
  },
  valueHeader: {
    width: 85,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  assetInfo: {
    flex: 1,
  },
  assetSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  assetPrice: {
    fontSize: 12,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  chartColumn: {
    width: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyColumn: {
    width: 80,
    alignItems: 'center',
  },
  qtyInput: {
    backgroundColor: '#1C2333',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    minWidth: 70,
    fontVariant: ['tabular-nums'],
  },
  unitLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  valueColumn: {
    width: 85,
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  valueTextActive: {
    color: Colors.text,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#1C2333',
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#1C2333',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  ctaTextDisabled: {
    color: Colors.textMuted,
  },
});
