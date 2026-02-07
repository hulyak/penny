import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  DollarSign,
  Calendar,
  Check,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import dividendService from '@/lib/dividendService';
import portfolioService from '@/lib/portfolioService';
import { Holding } from '@/types';

type DividendStatus = 'announced' | 'pending' | 'received' | 'reinvested';

const STATUS_OPTIONS: { value: DividendStatus; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'pending', label: 'Pending' },
  { value: 'announced', label: 'Announced' },
  { value: 'reinvested', label: 'Reinvested' },
];

export default function AddDividendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [showHoldingPicker, setShowHoldingPicker] = useState(false);
  const [holdingSearch, setHoldingSearch] = useState('');

  const [holdingName, setHoldingName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [amountPerShare, setAmountPerShare] = useState('');
  const [shares, setShares] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [exDate, setExDate] = useState('');
  const [status, setStatus] = useState<DividendStatus>('received');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadHoldings = async () => {
    try {
      const loaded = await portfolioService.getHoldings();
      // Filter to stock/ETF types that typically pay dividends
      const dividendHoldings = loaded.filter((h) =>
        ['stock', 'etf', 'mutual_fund'].includes(h.type)
      );
      setHoldings(dividendHoldings);
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setIsLoadingHoldings(false);
    }
  };

  const selectHolding = (holding: Holding) => {
    setSelectedHolding(holding);
    setHoldingName(holding.name);
    setSymbol(holding.symbol || '');
    setShares(holding.quantity.toString());
    setShowHoldingPicker(false);
    setHoldingSearch('');
  };

  const amountNum = parseFloat(amountPerShare) || 0;
  const sharesNum = parseFloat(shares) || 0;
  const totalAmount = amountNum * sharesNum;

  const filteredHoldings = holdings.filter(
    (h) =>
      h.name.toLowerCase().includes(holdingSearch.toLowerCase()) ||
      (h.symbol && h.symbol.toLowerCase().includes(holdingSearch.toLowerCase()))
  );

  const handleSave = async () => {
    if (!holdingName.trim()) {
      Alert.alert('Missing Info', 'Please select a holding or enter a name.');
      return;
    }
    if (amountNum <= 0) {
      Alert.alert('Missing Info', 'Please enter the dividend amount per share.');
      return;
    }
    if (sharesNum <= 0) {
      Alert.alert('Missing Info', 'Please enter the number of shares.');
      return;
    }
    if (!paymentDate) {
      Alert.alert('Missing Info', 'Please enter a payment date.');
      return;
    }

    setIsSaving(true);
    try {
      await dividendService.addDividend({
        holdingId: selectedHolding?.id || `manual_${Date.now()}`,
        holdingName: holdingName.trim(),
        symbol: symbol.trim() || undefined,
        exDate: exDate || paymentDate,
        paymentDate,
        amount: amountNum,
        totalAmount,
        shares: sharesNum,
        status,
        notes: notes.trim() || undefined,
      });

      router.back();
    } catch (error) {
      console.error('Failed to save dividend:', error);
      Alert.alert('Error', 'Failed to save the dividend. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Dividend</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Select Holding */}
        <Text style={styles.sectionTitle}>Holding</Text>
        <Pressable
          style={styles.holdingSelector}
          onPress={() => setShowHoldingPicker(!showHoldingPicker)}
        >
          <View style={styles.holdingSelectorContent}>
            {selectedHolding ? (
              <>
                <Text style={styles.holdingSelectedName}>
                  {selectedHolding.name}
                </Text>
                <Text style={styles.holdingSelectedSymbol}>
                  {selectedHolding.symbol} · {selectedHolding.quantity} shares
                </Text>
              </>
            ) : (
              <Text style={styles.holdingPlaceholder}>
                Select from portfolio or enter manually
              </Text>
            )}
          </View>
          <ChevronDown
            size={18}
            color={Colors.textMuted}
            style={{
              transform: [{ rotate: showHoldingPicker ? '180deg' : '0deg' }],
            }}
          />
        </Pressable>

        {showHoldingPicker && (
          <View style={styles.holdingPickerContainer}>
            <View style={styles.searchRow}>
              <Search size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={holdingSearch}
                onChangeText={setHoldingSearch}
                placeholder="Search holdings..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            {isLoadingHoldings ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ padding: 16 }}
              />
            ) : filteredHoldings.length === 0 ? (
              <Text style={styles.noHoldingsText}>
                {holdings.length === 0
                  ? 'No stock/ETF holdings found'
                  : 'No matching holdings'}
              </Text>
            ) : (
              filteredHoldings.slice(0, 8).map((holding) => (
                <Pressable
                  key={holding.id}
                  style={styles.holdingOption}
                  onPress={() => selectHolding(holding)}
                >
                  <Text style={styles.holdingOptionName}>{holding.name}</Text>
                  <Text style={styles.holdingOptionDetail}>
                    {holding.symbol} · {holding.quantity} shares
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Manual Entry */}
        <Text style={styles.sectionTitle}>Dividend Details</Text>
        <View style={styles.formCard}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Holding Name</Text>
            <TextInput
              style={styles.input}
              value={holdingName}
              onChangeText={setHoldingName}
              placeholder="e.g. Apple Inc."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Symbol</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={(text) => setSymbol(text.toUpperCase())}
              placeholder="e.g. AAPL"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <DollarSign size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Amount Per Share</Text>
            <TextInput
              style={styles.input}
              value={amountPerShare}
              onChangeText={setAmountPerShare}
              placeholder="0.24"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Shares</Text>
            <TextInput
              style={styles.input}
              value={shares}
              onChangeText={setShares}
              placeholder="100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Calendar size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Payment Date</Text>
            <TextInput
              style={styles.input}
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Calendar size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Ex-Dividend Date</Text>
            <TextInput
              style={styles.input}
              value={exDate}
              onChangeText={setExDate}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={[styles.inputRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Status */}
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <Pressable
              key={value}
              style={[
                styles.statusCard,
                status === value && styles.statusCardSelected,
              ]}
              onPress={() => setStatus(value)}
            >
              <Text
                style={[
                  styles.statusLabel,
                  status === value && styles.statusLabelSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Preview */}
        {totalAmount > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Dividend Summary</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Per Share</Text>
              <Text style={styles.previewValue}>
                ${amountNum.toFixed(4)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Shares</Text>
              <Text style={styles.previewValue}>
                {sharesNum.toLocaleString()}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Total Dividend</Text>
              <Text style={[styles.previewValue, { color: Colors.success }]}>
                $
                {totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Add Dividend'}
          </Text>
        </Pressable>
      </ScrollView>
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
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  holdingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  holdingSelectorContent: {
    flex: 1,
  },
  holdingSelectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingSelectedSymbol: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  holdingPlaceholder: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  holdingPickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 4,
  },
  noHoldingsText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 16,
  },
  holdingOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  holdingOptionName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  holdingOptionDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    minWidth: 120,
    paddingVertical: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statusCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
