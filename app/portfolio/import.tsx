import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Download,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { Holding, AssetType, ASSET_TYPE_CONFIG } from '@/types';
import portfolioService from '@/lib/portfolioService';

interface ParsedHolding {
  name: string;
  symbol?: string;
  type: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  purchaseDate?: string;
  isValid: boolean;
  error?: string;
}

const CSV_TEMPLATE = `Name,Symbol,Type,Quantity,Purchase Price,Current Price,Purchase Date
Apple Inc,AAPL,stock,10,150.00,175.00,2024-01-15
Vanguard S&P 500 ETF,VOO,etf,5,400.00,450.00,2024-02-01
Bitcoin,BTC,crypto,0.5,40000.00,45000.00,2024-03-01
Gold Bullion,,gold,2,1900.00,2000.00,2024-01-01
US Treasury Bond,,bond,1000,100.00,,2024-06-01`;

const ASSET_TYPE_MAP: Record<string, AssetType> = {
  'stock': 'stock',
  'stocks': 'stock',
  'equity': 'stock',
  'share': 'stock',
  'shares': 'stock',
  'etf': 'etf',
  'fund': 'mutual_fund',
  'mutual fund': 'mutual_fund',
  'mutual_fund': 'mutual_fund',
  'bond': 'bond',
  'bonds': 'bond',
  'fixed income': 'bond',
  'gold': 'gold',
  'silver': 'silver',
  'platinum': 'platinum',
  'commodity': 'gold',
  'real estate': 'real_estate',
  'real_estate': 'real_estate',
  'property': 'real_estate',
  'reit': 'real_estate',
  'fd': 'fixed_deposit',
  'fixed deposit': 'fixed_deposit',
  'fixed_deposit': 'fixed_deposit',
  'cd': 'fixed_deposit',
  'crypto': 'crypto',
  'cryptocurrency': 'crypto',
  'bitcoin': 'crypto',
  'cash': 'cash',
  'other': 'other',
};

export default function ImportScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'csv' | 'quick'>('csv');
  const [csvText, setCsvText] = useState('');
  const [parsedHoldings, setParsedHoldings] = useState<ParsedHolding[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Quick entry state
  const [quickEntries, setQuickEntries] = useState<{
    text: string;
    parsed?: ParsedHolding;
  }[]>([{ text: '' }]);

  const parseCSV = (text: string): ParsedHolding[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    const holdings: ParsedHolding[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Handle CSV with commas in quoted strings
      const values = parseCSVLine(line);

      if (values.length < 4) {
        holdings.push({
          name: values[0] || 'Unknown',
          type: 'other',
          quantity: 0,
          purchasePrice: 0,
          isValid: false,
          error: 'Missing required fields (need at least Name, Symbol, Type, Quantity)',
        });
        continue;
      }

      const [name, symbol, typeStr, quantityStr, priceStr, currentPriceStr, dateStr] = values;

      const type = ASSET_TYPE_MAP[typeStr?.toLowerCase().trim()] || 'other';
      const quantity = parseFloat(quantityStr) || 0;
      const purchasePrice = parseFloat(priceStr) || 0;
      const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : undefined;

      const isValid = !!name && quantity > 0 && purchasePrice > 0;

      holdings.push({
        name: name?.trim() || 'Unknown',
        symbol: symbol?.trim().toUpperCase() || undefined,
        type,
        quantity,
        purchasePrice,
        currentPrice,
        purchaseDate: dateStr?.trim() || undefined,
        isValid,
        error: !isValid ? 'Invalid quantity or price' : undefined,
      });
    }

    return holdings;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const handleParseCSV = () => {
    setIsParsing(true);
    try {
      const holdings = parseCSV(csvText);
      setParsedHoldings(holdings);

      const validCount = holdings.filter(h => h.isValid).length;
      if (holdings.length === 0) {
        Alert.alert('No Data Found', 'Please paste valid CSV data with a header row.');
      } else if (validCount === 0) {
        Alert.alert('Parse Error', 'No valid holdings found. Check the format and try again.');
      }
    } catch (error) {
      Alert.alert('Parse Error', 'Failed to parse CSV. Please check the format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const validHoldings = parsedHoldings.filter(h => h.isValid);

    if (validHoldings.length === 0) {
      Alert.alert('No Valid Holdings', 'Please add or fix holdings before importing.');
      return;
    }

    setIsImporting(true);
    try {
      for (const parsed of validHoldings) {
        const holding: Holding = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: parsed.type,
          name: parsed.name,
          symbol: parsed.symbol,
          quantity: parsed.quantity,
          purchasePrice: parsed.purchasePrice,
          purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
          currency: 'USD',
          currentPrice: parsed.currentPrice || parsed.purchasePrice,
          currentValue: parsed.quantity * (parsed.currentPrice || parsed.purchasePrice),
          lastPriceUpdate: new Date().toISOString(),
          isManualPricing: !parsed.symbol,
          assetClass: ASSET_TYPE_CONFIG[parsed.type].assetClass,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await portfolioService.saveHolding(holding);
      }

      Alert.alert(
        'Import Successful',
        `Successfully imported ${validHoldings.length} holding${validHoldings.length > 1 ? 's' : ''}.`,
        [{ text: 'View Portfolio', onPress: () => router.replace('/(tabs)/portfolio') }]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Import Failed', 'An error occurred while importing. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyTemplate = async () => {
    await Clipboard.setStringAsync(CSV_TEMPLATE);
    Alert.alert('Copied!', 'CSV template copied to clipboard. Paste it into a spreadsheet app to fill in your data.');
  };

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setCsvText(text);
      // Auto-parse if it looks like CSV
      if (text.includes(',') && text.includes('\n')) {
        const holdings = parseCSV(text);
        setParsedHoldings(holdings);
      }
    }
  };

  const removeHolding = (index: number) => {
    setParsedHoldings(prev => prev.filter((_, i) => i !== index));
  };

  // Quick entry parsing - natural language style
  const parseQuickEntry = (text: string): ParsedHolding | undefined => {
    if (!text.trim()) return undefined;

    // Pattern: "10 AAPL at $150" or "10 shares of AAPL at 150" or "0.5 BTC at 40000"
    const patterns = [
      // "10 AAPL at $150" or "10 AAPL @ 150"
      /^(\d+\.?\d*)\s*(?:shares?\s+(?:of\s+)?)?([A-Za-z]+)\s*(?:at|@)\s*\$?(\d+\.?\d*)$/i,
      // "AAPL 10 shares at $150"
      /^([A-Za-z]+)\s+(\d+\.?\d*)\s*(?:shares?)?\s*(?:at|@)\s*\$?(\d+\.?\d*)$/i,
      // Just "10 AAPL 150" (quantity symbol price)
      /^(\d+\.?\d*)\s+([A-Za-z]+)\s+\$?(\d+\.?\d*)$/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let quantity: number, symbol: string, price: number;

        if (pattern === patterns[1]) {
          // AAPL 10 shares at $150
          symbol = match[1].toUpperCase();
          quantity = parseFloat(match[2]);
          price = parseFloat(match[3]);
        } else {
          // 10 AAPL at $150 or 10 AAPL 150
          quantity = parseFloat(match[1]);
          symbol = match[2].toUpperCase();
          price = parseFloat(match[3]);
        }

        // Detect asset type from symbol
        let type: AssetType = 'stock';
        const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'DOT', 'MATIC', 'LINK', 'AVAX'];
        const etfSymbols = ['VOO', 'VTI', 'SPY', 'QQQ', 'IWM', 'VEA', 'VWO', 'BND', 'AGG'];

        if (cryptoSymbols.includes(symbol)) {
          type = 'crypto';
        } else if (etfSymbols.includes(symbol)) {
          type = 'etf';
        }

        return {
          name: symbol,
          symbol,
          type,
          quantity,
          purchasePrice: price,
          isValid: quantity > 0 && price > 0,
        };
      }
    }

    return {
      name: text,
      type: 'other',
      quantity: 0,
      purchasePrice: 0,
      isValid: false,
      error: 'Could not parse. Try format: "10 AAPL at $150"',
    };
  };

  const handleQuickEntryChange = (index: number, text: string) => {
    setQuickEntries(prev => {
      const updated = [...prev];
      updated[index] = {
        text,
        parsed: parseQuickEntry(text),
      };
      return updated;
    });
  };

  const addQuickEntry = () => {
    setQuickEntries(prev => [...prev, { text: '' }]);
  };

  const removeQuickEntry = (index: number) => {
    if (quickEntries.length > 1) {
      setQuickEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuickImport = async () => {
    const validEntries = quickEntries.filter(e => e.parsed?.isValid);

    if (validEntries.length === 0) {
      Alert.alert('No Valid Entries', 'Please add holdings in the format: "10 AAPL at $150"');
      return;
    }

    setIsImporting(true);
    try {
      for (const entry of validEntries) {
        const parsed = entry.parsed!;
        const holding: Holding = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: parsed.type,
          name: parsed.name,
          symbol: parsed.symbol,
          quantity: parsed.quantity,
          purchasePrice: parsed.purchasePrice,
          purchaseDate: new Date().toISOString().split('T')[0],
          currency: 'USD',
          currentPrice: parsed.purchasePrice,
          currentValue: parsed.quantity * parsed.purchasePrice,
          lastPriceUpdate: new Date().toISOString(),
          isManualPricing: false,
          assetClass: ASSET_TYPE_CONFIG[parsed.type].assetClass,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await portfolioService.saveHolding(holding);
      }

      Alert.alert(
        'Import Successful',
        `Added ${validEntries.length} holding${validEntries.length > 1 ? 's' : ''} to your portfolio.`,
        [{ text: 'View Portfolio', onPress: () => router.replace('/(tabs)/portfolio') }]
      );
    } catch (error) {
      console.error('Quick import error:', error);
      Alert.alert('Import Failed', 'An error occurred. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedHoldings.filter(h => h.isValid).length;
  const quickValidCount = quickEntries.filter(e => e.parsed?.isValid).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Import Holdings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'csv' && styles.tabActive]}
          onPress={() => setActiveTab('csv')}
        >
          <FileSpreadsheet size={18} color={activeTab === 'csv' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'csv' && styles.tabTextActive]}>
            CSV Import
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'quick' && styles.tabActive]}
          onPress={() => setActiveTab('quick')}
        >
          <Sparkles size={18} color={activeTab === 'quick' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
            Quick Add
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'csv' ? (
          <>
            {/* CSV Instructions */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Import from Spreadsheet</Text>
              <Text style={styles.instructionText}>
                Export your holdings from your broker or spreadsheet as CSV, then paste below.
              </Text>
              <View style={styles.instructionActions}>
                <Pressable style={styles.instructionButton} onPress={handleCopyTemplate}>
                  <Copy size={16} color={Colors.primary} />
                  <Text style={styles.instructionButtonText}>Copy Template</Text>
                </Pressable>
                <Pressable style={styles.instructionButton} onPress={handlePasteFromClipboard}>
                  <Upload size={16} color={Colors.primary} />
                  <Text style={styles.instructionButtonText}>Paste from Clipboard</Text>
                </Pressable>
              </View>
            </View>

            {/* CSV Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Paste CSV Data</Text>
              <TextInput
                style={styles.csvInput}
                placeholder={`Name,Symbol,Type,Quantity,Purchase Price,Current Price,Purchase Date\nApple Inc,AAPL,stock,10,150.00,175.00,2024-01-15`}
                placeholderTextColor={Colors.textMuted}
                value={csvText}
                onChangeText={setCsvText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.parseButton, (!csvText || isParsing) && styles.buttonDisabled]}
                onPress={handleParseCSV}
                disabled={!csvText || isParsing}
              >
                {isParsing ? (
                  <ActivityIndicator size="small" color={Colors.textLight} />
                ) : (
                  <Text style={styles.parseButtonText}>Parse CSV</Text>
                )}
              </Pressable>
            </View>

            {/* Parsed Results */}
            {parsedHoldings.length > 0 && (
              <View style={styles.resultsSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>
                    Parsed Holdings ({validCount}/{parsedHoldings.length} valid)
                  </Text>
                </View>

                {parsedHoldings.map((holding, index) => (
                  <View
                    key={index}
                    style={[styles.holdingCard, !holding.isValid && styles.holdingCardInvalid]}
                  >
                    <View style={styles.holdingInfo}>
                      <View style={styles.holdingHeader}>
                        {holding.isValid ? (
                          <Check size={16} color={Colors.success} />
                        ) : (
                          <AlertCircle size={16} color={Colors.danger} />
                        )}
                        <Text style={styles.holdingName}>{holding.name}</Text>
                        {holding.symbol && (
                          <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                        )}
                      </View>
                      <Text style={styles.holdingDetails}>
                        {holding.quantity} × ${holding.purchasePrice.toFixed(2)} • {ASSET_TYPE_CONFIG[holding.type]?.label || holding.type}
                      </Text>
                      {holding.error && (
                        <Text style={styles.holdingError}>{holding.error}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => removeHolding(index)} style={styles.removeButton}>
                      <Trash2 size={18} color={Colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Quick Add Instructions */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Quick Add Holdings</Text>
              <Text style={styles.instructionText}>
                Type naturally like: "10 AAPL at $150" or "0.5 BTC at $45000"
              </Text>
            </View>

            {/* Quick Entry Inputs */}
            <View style={styles.quickEntrySection}>
              {quickEntries.map((entry, index) => (
                <View key={index} style={styles.quickEntryRow}>
                  <View style={styles.quickEntryInputWrapper}>
                    <TextInput
                      style={[
                        styles.quickEntryInput,
                        entry.parsed?.isValid && styles.quickEntryInputValid,
                        entry.parsed && !entry.parsed.isValid && styles.quickEntryInputInvalid,
                      ]}
                      placeholder="10 AAPL at $150"
                      placeholderTextColor={Colors.textMuted}
                      value={entry.text}
                      onChangeText={(text) => handleQuickEntryChange(index, text)}
                    />
                    {entry.parsed?.isValid && (
                      <View style={styles.quickEntryValid}>
                        <Check size={16} color={Colors.success} />
                      </View>
                    )}
                  </View>
                  {quickEntries.length > 1 && (
                    <Pressable onPress={() => removeQuickEntry(index)} style={styles.quickRemoveButton}>
                      <Trash2 size={18} color={Colors.danger} />
                    </Pressable>
                  )}
                </View>
              ))}

              {/* Parsed Preview */}
              {quickEntries.some(e => e.parsed?.isValid) && (
                <View style={styles.quickPreview}>
                  <Text style={styles.quickPreviewTitle}>Will Import:</Text>
                  {quickEntries.filter(e => e.parsed?.isValid).map((entry, index) => (
                    <Text key={index} style={styles.quickPreviewItem}>
                      • {entry.parsed!.quantity} {entry.parsed!.symbol} at ${entry.parsed!.purchasePrice.toFixed(2)} ({ASSET_TYPE_CONFIG[entry.parsed!.type].label})
                    </Text>
                  ))}
                </View>
              )}

              <Pressable style={styles.addMoreButton} onPress={addQuickEntry}>
                <Plus size={18} color={Colors.primary} />
                <Text style={styles.addMoreText}>Add Another</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.importButton,
            (activeTab === 'csv' ? validCount === 0 : quickValidCount === 0) && styles.buttonDisabled,
            isImporting && styles.buttonDisabled,
          ]}
          onPress={activeTab === 'csv' ? handleImport : handleQuickImport}
          disabled={(activeTab === 'csv' ? validCount === 0 : quickValidCount === 0) || isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : (
            <>
              <Upload size={20} color={Colors.textLight} />
              <Text style={styles.importButtonText}>
                Import {activeTab === 'csv' ? validCount : quickValidCount} Holding{(activeTab === 'csv' ? validCount : quickValidCount) !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  instructionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  instructionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  instructionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  instructionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  csvInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 160,
    fontFamily: 'monospace',
  },
  parseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  parseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  holdingCardInvalid: {
    borderColor: Colors.danger + '50',
    backgroundColor: Colors.danger + '08',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  holdingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingSymbol: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  holdingDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 24,
  },
  holdingError: {
    fontSize: 12,
    color: Colors.danger,
    marginLeft: 24,
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  quickEntrySection: {
    marginBottom: 24,
  },
  quickEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  quickEntryInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  quickEntryInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    paddingRight: 44,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickEntryInputValid: {
    borderColor: Colors.success,
  },
  quickEntryInputInvalid: {
    borderColor: Colors.danger + '50',
  },
  quickEntryValid: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
  quickRemoveButton: {
    padding: 8,
  },
  quickPreview: {
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  quickPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 8,
  },
  quickPreviewItem: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
