import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trash2,
  Bell,
  Calendar,
  Tag,
  Globe,
  FileText,
  DollarSign,
  RefreshCw,
  X,
  BarChart2,
  Plus,
  Minus,
  Share2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Holding, ASSET_TYPE_CONFIG, ASSET_CLASS_COLORS } from '@/types';
import { hasLivePricing } from '@/lib/priceService';
import { formatInterestFrequency } from '@/lib/interestTracking';
import { StockChart, CryptoChart, getCoinGeckoId } from '@/components/StockChart';
import portfolioService from '@/lib/portfolioService';
import EnhancedCard from '@/components/ui/EnhancedCard';
import Button from '@/components/ui/Button';
import haptics from '@/lib/haptics';

export default function HoldingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [holding, setHolding] = useState<Holding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    loadHolding();
  }, [id]);

  const loadHolding = async () => {
    try {
      const holdings = await portfolioService.getHoldings();
      const found = holdings.find((h) => h.id === id);
      setHolding(found || null);
    } catch (error) {
      console.error('Failed to load holding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to delete "${holding?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await portfolioService.deleteHolding(id!);
              router.back();
            } catch (error) {
              console.error('Failed to delete holding:', error);
              Alert.alert('Error', 'Failed to delete investment.');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    try {
      if (holding) {
        const updatedHolding: Holding = {
          ...holding,
          currentPrice: price,
          currentValue: holding.quantity * price,
          lastPriceUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await portfolioService.saveHolding(updatedHolding);
        setHolding(updatedHolding);
        setShowPriceModal(false);
        setNewPrice('');
      }
    } catch (error) {
      console.error('Failed to update price:', error);
      Alert.alert('Error', 'Failed to update price.');
    }
  };

  const isManualAsset = holding ? !hasLivePricing(holding.type) : false;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!holding) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Investment not found</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
  const investedValue = holding.quantity * holding.purchasePrice;
  const gain = currentValue - investedValue;
  const gainPercent = investedValue > 0 ? (gain / investedValue) * 100 : 0;
  const isGain = gain >= 0;
  const currentPrice = holding.currentPrice || holding.purchasePrice;

  const config = ASSET_TYPE_CONFIG[holding.type];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              haptics.lightTap();
              router.push(`/portfolio/add-alert?holdingId=${id}` as any);
            }}
          >
            <Bell size={22} color={Colors.text} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              haptics.lightTap();
              handleDelete();
            }}
          >
            <Trash2 size={22} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Asset Info Header */}
      <View style={styles.assetHeader}>
        <View style={[styles.assetIcon, { backgroundColor: ASSET_CLASS_COLORS[holding.assetClass] + '30' }]}>
          <Text style={styles.assetIconText}>
            {holding.symbol?.slice(0, 2).toUpperCase() || holding.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.assetName}>{holding.name}</Text>
        {holding.symbol && (
          <Text style={styles.assetSymbol}>{holding.symbol}</Text>
        )}
        <View style={[styles.assetTypeBadge, { backgroundColor: ASSET_CLASS_COLORS[holding.assetClass] + '20', borderColor: ASSET_CLASS_COLORS[holding.assetClass] }]}>
          <Text style={[styles.assetTypeBadgeText, { color: ASSET_CLASS_COLORS[holding.assetClass] }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Current Value Card */}
      <EnhancedCard style={styles.valueCard} variant="elevated">
        <Text style={styles.valueLabel}>Current Value</Text>
        <Text style={styles.valueAmount}>
          ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.changeRow}>
          {isGain ? (
            <TrendingUp size={18} color={Colors.success} />
          ) : (
            <TrendingDown size={18} color={Colors.danger} />
          )}
          <Text style={[styles.changeText, { color: isGain ? Colors.success : Colors.danger }]}>
            {isGain ? '+' : ''}${Math.abs(gain).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' '}({isGain ? '+' : ''}{gainPercent.toFixed(2)}%)
          </Text>
        </View>
      </EnhancedCard>

      {/* Price Chart */}
      {holding.symbol && hasLivePricing(holding.type) && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <BarChart2 size={20} color={Colors.text} />
            <Text style={styles.chartTitle}>Price Chart</Text>
          </View>
          <EnhancedCard variant="chart" style={styles.chartCard}>
            {holding.type === 'crypto' ? (
              getCoinGeckoId(holding.symbol) ? (
                <CryptoChart coinId={getCoinGeckoId(holding.symbol)!} height={300} />
              ) : (
                <StockChart symbol={holding.symbol} height={300} />
              )
            ) : (
              <StockChart symbol={holding.symbol} height={300} />
            )}
          </EnhancedCard>
        </View>
      )}

      {/* Details Section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Details</Text>
        <EnhancedCard>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{holding.quantity}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purchase Price</Text>
            <Text style={styles.detailValue}>
              ${holding.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Price</Text>
            <Text style={styles.detailValue}>
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Invested</Text>
            <Text style={styles.detailValue}>
              ${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Purchase Date</Text>
            <Text style={styles.detailValue}>
              {new Date(holding.purchaseDate).toLocaleDateString()}
            </Text>
          </View>
          {holding.sector && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Tag size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Sector</Text>
                <Text style={styles.detailValue}>{holding.sector}</Text>
              </View>
            </>
          )}
          {holding.country && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Globe size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Country</Text>
                <Text style={styles.detailValue}>{holding.country}</Text>
              </View>
            </>
          )}
          {holding.interestRate && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest Rate</Text>
                <Text style={styles.detailValue}>{holding.interestRate}%</Text>
              </View>
            </>
          )}
          {holding.interestFrequency && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest Frequency</Text>
                <Text style={styles.detailValue}>{formatInterestFrequency(holding.interestFrequency)}</Text>
              </View>
            </>
          )}
        </EnhancedCard>
      </View>

      {/* Notes */}
      {holding.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <EnhancedCard>
            <View style={styles.notesContent}>
              <FileText size={18} color={Colors.textSecondary} />
              <Text style={styles.notesText}>{holding.notes}</Text>
            </View>
          </EnhancedCard>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <Button
          title="Buy More"
          onPress={() => router.push(`/portfolio/add?symbol=${holding.symbol}` as any)}
          variant="primary"
          size="large"
          style={styles.actionButton}
          icon={<Plus size={20} color={Colors.text} />}
        />
        <Button
          title="Sell"
          onPress={() => Alert.alert('Sell', 'Sell functionality coming soon')}
          variant="danger"
          size="large"
          style={styles.actionButton}
          icon={<Minus size={20} color={Colors.text} />}
        />
        <Button
          title="Set Alert"
          onPress={() => router.push(`/portfolio/add-alert?holdingId=${id}` as any)}
          variant="secondary"
          size="large"
          style={styles.actionButton}
          icon={<Bell size={20} color={Colors.text} />}
        />
        <Button
          title="Share"
          onPress={() => Alert.alert('Share', 'Share functionality coming soon')}
          variant="secondary"
          size="large"
          style={styles.actionButton}
          icon={<Share2 size={20} color={Colors.text} />}
        />
      </View>

      {/* Update Price Modal for Manual Assets */}
      {isManualAsset && (
        <Modal visible={showPriceModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Price</Text>
                <Pressable onPress={() => setShowPriceModal(false)}>
                  <X size={24} color={Colors.text} />
                </Pressable>
              </View>
              <TextInput
                style={styles.modalInput}
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="Enter new price"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textSecondary}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowPriceModal(false)}
                  variant="secondary"
                  size="medium"
                  style={styles.modalButton}
                />
                <Button
                  title="Update"
                  onPress={handleUpdatePrice}
                  variant="primary"
                  size="medium"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 16,
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  assetIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  assetIconText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  assetName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  assetTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  assetTypeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  valueAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartSection: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  chartCard: {
    padding: 0,
    overflow: 'hidden',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesContent: {
    flexDirection: 'row',
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  actionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
