import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Plus,
  Check,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AssetType } from '@/types';
import {
  useOnboarding,
  OnboardingAsset,
  POPULAR_STOCKS,
  POPULAR_CRYPTO,
  POPULAR_ETFS,
} from '@/context/OnboardingContext';
import { getPrice, searchSymbols, searchCrypto } from '@/lib/priceService';
import { SparklineChart, generateMockChartData } from './SparklineChart';

interface AssetWithPrice {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  type: AssetType;
}

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

export function AssetSelectionScreen({ onContinue, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const {
    selectedAssetTypes,
    selectedAssets,
    addAsset,
    removeAsset,
  } = useOnboarding();

  const [activeTab, setActiveTab] = useState<AssetType>(selectedAssetTypes[0] || 'stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetWithPrice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularAssets, setPopularAssets] = useState<AssetWithPrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get tabs based on selected asset types
  const tabs = selectedAssetTypes.filter(type =>
    ['stock', 'etf', 'crypto', 'gold'].includes(type)
  );

  // Load popular assets with prices
  useEffect(() => {
    loadPopularAssets(activeTab);
  }, [activeTab]);

  const loadPopularAssets = async (type: AssetType) => {
    setIsLoadingPrices(true);
    try {
      let assets: { symbol: string; name: string }[] = [];

      if (type === 'stock') {
        assets = POPULAR_STOCKS;
      } else if (type === 'etf') {
        assets = POPULAR_ETFS;
      } else if (type === 'crypto') {
        assets = POPULAR_CRYPTO;
      } else if (type === 'gold') {
        const goldPrice = await getPrice('gold');
        if (goldPrice) {
          setPopularAssets([{
            symbol: 'XAU',
            name: 'Gold Spot',
            price: goldPrice.price,
            changePercent: goldPrice.changePercent || 0,
            type: 'gold',
          }]);
        }
        setIsLoadingPrices(false);
        return;
      }

      // Fetch prices for all assets
      const assetsWithPrices: AssetWithPrice[] = [];
      for (const asset of assets.slice(0, 8)) {
        try {
          const priceResult = await getPrice(type, asset.symbol);
          if (priceResult) {
            assetsWithPrices.push({
              ...asset,
              price: priceResult.price,
              changePercent: priceResult.changePercent || 0,
              type,
            });
          }
        } catch {
          console.log(`Failed to fetch price for ${asset.symbol}`);
        }
      }

      setPopularAssets(assetsWithPrices);
    } catch (error) {
      console.error('Failed to load popular assets:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results: { symbol: string; name: string }[] = [];

        if (activeTab === 'crypto') {
          results = await searchCrypto(query);
        } else {
          const stockResults = await searchSymbols(query);
          results = stockResults.map(r => ({ symbol: r.symbol, name: r.description }));
        }

        // Fetch prices for search results
        const resultsWithPrices: AssetWithPrice[] = [];
        for (const result of results.slice(0, 5)) {
          try {
            const priceResult = await getPrice(activeTab, result.symbol);
            if (priceResult) {
              resultsWithPrices.push({
                ...result,
                price: priceResult.price,
                changePercent: priceResult.changePercent || 0,
                type: activeTab,
              });
            }
          } catch {
            // Skip assets without price data
          }
        }

        setSearchResults(resultsWithPrices);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [activeTab]);

  const handleAddAsset = (asset: AssetWithPrice) => {
    const onboardingAsset: OnboardingAsset = {
      id: `${asset.type}-${asset.symbol}`,
      type: asset.type,
      name: asset.name,
      symbol: asset.symbol,
      currentPrice: asset.price,
      changePercent: asset.changePercent,
    };
    addAsset(onboardingAsset);
  };

  const isAssetSelected = (symbol: string, type: AssetType) => {
    return selectedAssets.some(a => a.symbol === symbol && a.type === type);
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

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const renderAssetRow = (asset: AssetWithPrice) => {
    const isSelected = isAssetSelected(asset.symbol, asset.type);
    const isPositive = asset.changePercent >= 0;
    const chartData = generateMockChartData(asset.price, asset.changePercent);

    return (
      <Pressable
        key={`${asset.type}-${asset.symbol}`}
        style={[styles.assetRow, isSelected && styles.assetRowSelected]}
        onPress={() => {
          if (isSelected) {
            removeAsset(`${asset.type}-${asset.symbol}`);
          } else {
            handleAddAsset(asset);
          }
        }}
      >
        {/* Symbol & Name */}
        <View style={styles.assetMain}>
          <Text style={styles.assetSymbol}>{asset.symbol}</Text>
          <Text style={styles.assetName} numberOfLines={1}>
            {asset.name}
          </Text>
        </View>

        {/* Mini Chart */}
        <View style={styles.chartColumn}>
          <SparklineChart
            data={chartData}
            width={60}
            height={28}
            color={isPositive ? '#00D09C' : '#FF6B6B'}
            showGradient={true}
          />
        </View>

        {/* Price */}
        <View style={styles.priceColumn}>
          <Text style={styles.priceText}>${formatPrice(asset.price)}</Text>
        </View>

        {/* Change */}
        <View style={[
          styles.changeColumn,
          { backgroundColor: isPositive ? 'rgba(0, 208, 156, 0.15)' : 'rgba(255, 107, 107, 0.15)' }
        ]}>
          <Text style={[
            styles.changeText,
            { color: isPositive ? '#00D09C' : '#FF6B6B' }
          ]}>
            {formatChange(asset.changePercent)}
          </Text>
        </View>

        {/* Add/Check Button */}
        <View style={styles.actionColumn}>
          {isSelected ? (
            <View style={styles.checkButton}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </View>
          ) : (
            <View style={styles.addButton}>
              <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const getTabLabel = (type: AssetType): string => {
    switch (type) {
      case 'stock':
        return 'Stocks';
      case 'etf':
        return 'ETFs';
      case 'crypto':
        return 'Crypto';
      case 'gold':
        return 'Gold';
      default:
        return type;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Assets</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      {tabs.length > 1 && (
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {getTabLabel(tab)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Instrument</Text>
        <Text style={[styles.tableHeaderText, styles.chartHeader]}>Chart</Text>
        <Text style={[styles.tableHeaderText, styles.priceHeader]}>Last</Text>
        <Text style={[styles.tableHeaderText, styles.changeHeader]}>Change</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Asset List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {searchQuery.length >= 2 ? (
          <>
            {searchResults.length > 0 ? (
              searchResults.map(renderAssetRow)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {isSearching ? 'Searching...' : 'No results found'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {isLoadingPrices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading prices...</Text>
              </View>
            ) : (
              popularAssets.map(renderAssetRow)
            )}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionCount}>
            {selectedAssets.length} selected
          </Text>
        </View>
        <Pressable
          style={[
            styles.ctaButton,
            selectedAssets.length === 0 && styles.ctaButtonDisabled,
          ]}
          onPress={onContinue}
          disabled={selectedAssets.length === 0}
        >
          <Text style={[
            styles.ctaText,
            selectedAssets.length === 0 && styles.ctaTextDisabled
          ]}>
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1C2333',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2333',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    width: 60,
    textAlign: 'center',
  },
  priceHeader: {
    width: 70,
    textAlign: 'right',
  },
  changeHeader: {
    width: 65,
    textAlign: 'right',
    marginRight: 8,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  assetRowSelected: {
    backgroundColor: 'rgba(0, 208, 156, 0.08)',
  },
  assetMain: {
    flex: 1,
  },
  assetSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  assetName: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chartColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceColumn: {
    width: 70,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  changeColumn: {
    width: 65,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionColumn: {
    width: 44,
    alignItems: 'center',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C2333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#1C2333',
    gap: 12,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: '#1C2333',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  ctaTextDisabled: {
    color: Colors.textMuted,
  },
});
