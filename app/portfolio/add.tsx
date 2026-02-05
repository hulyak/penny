import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  AssetType,
  AssetClass,
  Holding,
  ASSET_TYPE_CONFIG,
} from '@/types';
import { searchSymbols, searchCrypto } from '@/lib/priceService';
import portfolioService from '@/lib/portfolioService';

const ASSET_TYPES: { type: AssetType; label: string; description: string }[] = [
  { type: 'stock', label: 'Stock', description: 'Individual company shares' },
  { type: 'etf', label: 'ETF', description: 'Exchange-traded funds' },
  { type: 'mutual_fund', label: 'Mutual Fund', description: 'Professionally managed funds' },
  { type: 'bond', label: 'Bond', description: 'Fixed income securities' },
  { type: 'gold', label: 'Gold', description: 'Physical gold or gold ETFs' },
  { type: 'real_estate', label: 'Real Estate', description: 'Property investments' },
  { type: 'fixed_deposit', label: 'Fixed Deposit', description: 'Bank FDs and CDs' },
  { type: 'crypto', label: 'Cryptocurrency', description: 'Digital currencies' },
  { type: 'cash', label: 'Cash', description: 'Cash and equivalents' },
  { type: 'other', label: 'Other', description: 'Other investments' },
];

const SECTORS = [
  'Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy',
  'Industrial', 'Materials', 'Utilities', 'Real Estate', 'Communications', 'Other'
];

const COUNTRIES = [
  'United States', 'India', 'United Kingdom', 'Germany', 'Japan',
  'China', 'Canada', 'Australia', 'Singapore', 'Other'
];

export default function AddHoldingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('United States');
  const [notes, setNotes] = useState('');

  // For fixed income
  const [interestRate, setInterestRate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');

  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Symbol search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAssetClass = (type: AssetType): AssetClass => {
    return ASSET_TYPE_CONFIG[type].assetClass;
  };

  // Debounced symbol search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results: { symbol: string; name: string }[] = [];

        if (assetType === 'crypto') {
          results = await searchCrypto(query);
        } else if (assetType === 'stock' || assetType === 'etf') {
          const stockResults = await searchSymbols(query);
          results = stockResults.map(r => ({ symbol: r.symbol, name: r.description }));
        }

        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [assetType]);

  // Select a search result
  const handleSelectSearchResult = (result: { symbol: string; name: string }) => {
    setSymbol(result.symbol);
    setName(result.name);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const validateStep1 = () => {
    if (!assetType) {
      Alert.alert('Select Asset Type', 'Please select what type of investment this is.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter the name of your investment.');
      return false;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Quantity Required', 'Please enter a valid quantity.');
      return false;
    }
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
      Alert.alert('Price Required', 'Please enter the purchase price.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!assetType) return;

    setIsSubmitting(true);
    try {
      const holding: Holding = {
        id: Date.now().toString(),
        type: assetType,
        name: name.trim(),
        symbol: symbol.trim() || undefined,
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate,
        currency: 'USD',
        currentPrice: currentPrice ? parseFloat(currentPrice) : parseFloat(purchasePrice),
        currentValue: parseFloat(quantity) * (currentPrice ? parseFloat(currentPrice) : parseFloat(purchasePrice)),
        lastPriceUpdate: new Date().toISOString(),
        isManualPricing: true,
        sector: sector || undefined,
        country: country || undefined,
        assetClass: getAssetClass(assetType),
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        maturityDate: maturityDate || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save holding via portfolio service (syncs to Firebase)
      await portfolioService.saveHolding(holding);

      router.back();
    } catch (error) {
      console.error('Failed to save holding:', error);
      Alert.alert('Error', 'Failed to save investment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of investment?</Text>
      <Text style={styles.stepSubtitle}>Select the category that best describes your investment</Text>

      <View style={styles.typeGrid}>
        {ASSET_TYPES.map((item) => (
          <Pressable
            key={item.type}
            style={[
              styles.typeCard,
              assetType === item.type && styles.typeCardSelected,
            ]}
            onPress={() => setAssetType(item.type)}
          >
            {assetType === item.type && (
              <View style={styles.checkMark}>
                <Check size={14} color={Colors.textLight} />
              </View>
            )}
            <Text style={[
              styles.typeLabel,
              assetType === item.type && styles.typeLabelSelected,
            ]}>
              {item.label}
            </Text>
            <Text style={styles.typeDescription}>{item.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Investment Details</Text>
      <Text style={styles.stepSubtitle}>Enter the basic details of your investment</Text>

      {/* Symbol Search for stocks, ETFs, and crypto */}
      {['stock', 'etf', 'crypto'].includes(assetType || '') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Search {assetType === 'crypto' ? 'Cryptocurrency' : 'Stock/ETF'}
          </Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={assetType === 'crypto' ? 'Search Bitcoin, Ethereum...' : 'Search Apple, Tesla, VOO...'}
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              />
              {isSearching && (
                <ActivityIndicator size="small" color={Colors.primary} style={styles.searchLoader} />
              )}
              {searchQuery.length > 0 && !isSearching && (
                <Pressable onPress={clearSearch} style={styles.clearButton}>
                  <X size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsDropdown}>
                {searchResults.map((result, index) => (
                  <Pressable
                    key={`${result.symbol}-${index}`}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSearchResult(result)}
                  >
                    <Text style={styles.searchResultSymbol}>{result.symbol}</Text>
                    <Text style={styles.searchResultName} numberOfLines={1}>{result.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.searchHint}>
            Search to auto-fill name and symbol, or enter manually below
          </Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Apple Inc, Vanguard S&P 500"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      {['stock', 'etf', 'crypto'].includes(assetType || '') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Symbol/Ticker</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., AAPL, VOO, BTC"
            placeholderTextColor={Colors.textMuted}
            value={symbol}
            onChangeText={(text) => setSymbol(text.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.inputLabel}>Buy Price *</Text>
          <TextInput
            style={styles.input}
            placeholder="$0.00"
            placeholderTextColor={Colors.textMuted}
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Current Price</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave empty if same as buy price"
          placeholderTextColor={Colors.textMuted}
          value={currentPrice}
          onChangeText={setCurrentPrice}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Purchase Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
          value={purchaseDate}
          onChangeText={setPurchaseDate}
        />
      </View>

      {['fixed_deposit', 'bond'].includes(assetType || '') && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 5.5"
              placeholderTextColor={Colors.textMuted}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Maturity Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={maturityDate}
              onChangeText={setMaturityDate}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Additional Info</Text>
      <Text style={styles.stepSubtitle}>Optional details for better insights</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sector</Text>
        <Pressable
          style={styles.pickerButton}
          onPress={() => setShowSectorPicker(!showSectorPicker)}
        >
          <Text style={[styles.pickerText, !sector && { color: Colors.textMuted }]}>
            {sector || 'Select sector'}
          </Text>
          <ChevronDown size={20} color={Colors.textMuted} />
        </Pressable>
        {showSectorPicker && (
          <View style={styles.pickerDropdown}>
            {SECTORS.map((s) => (
              <Pressable
                key={s}
                style={styles.pickerOption}
                onPress={() => {
                  setSector(s);
                  setShowSectorPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Country</Text>
        <Pressable
          style={styles.pickerButton}
          onPress={() => setShowCountryPicker(!showCountryPicker)}
        >
          <Text style={styles.pickerText}>{country}</Text>
          <ChevronDown size={20} color={Colors.textMuted} />
        </Pressable>
        {showCountryPicker && (
          <View style={styles.pickerDropdown}>
            {COUNTRIES.map((c) => (
              <Pressable
                key={c}
                style={styles.pickerOption}
                onPress={() => {
                  setCountry(c);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional notes..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Investment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{ASSET_TYPE_CONFIG[assetType!].label}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Quantity</Text>
          <Text style={styles.summaryValue}>{quantity}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Invested</Text>
          <Text style={styles.summaryValue}>
            ${(parseFloat(quantity || '0') * parseFloat(purchasePrice || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Investment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < 3 ? (
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.buttonPrimaryText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, styles.buttonPrimary, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonPrimaryText}>
              {isSubmitting ? 'Saving...' : 'Add Investment'}
            </Text>
          </Pressable>
        )}
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
    backgroundColor: Colors.background,
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
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
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
  searchContainer: {
    position: 'relative',
    zIndex: 100,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  searchLoader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 250,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    width: 60,
  },
  searchResultName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  searchHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },

  pickerButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
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
    opacity: 0.6,
  },
});
