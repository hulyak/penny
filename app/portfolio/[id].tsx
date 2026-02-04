import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
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
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { Holding, ASSET_TYPE_CONFIG, ASSET_CLASS_COLORS } from '@/types';

const STORAGE_KEY = 'penny_portfolio_holdings';

export default function HoldingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [holding, setHolding] = useState<Holding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHolding();
  }, [id]);

  const loadHolding = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const holdings: Holding[] = JSON.parse(stored);
        const found = holdings.find((h) => h.id === id);
        setHolding(found || null);
      }
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
              const stored = await AsyncStorage.getItem(STORAGE_KEY);
              if (stored) {
                const holdings: Holding[] = JSON.parse(stored);
                const updated = holdings.filter((h) => h.id !== id);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              }
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
            style={styles.actionButton}
            onPress={() => router.push(`/portfolio/add-alert?holdingId=${id}` as any)}
          >
            <Bell size={20} color={Colors.accent} />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleDelete}>
            <Trash2 size={20} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Holding Info */}
      <View style={styles.infoSection}>
        <View style={[styles.iconLarge, { backgroundColor: ASSET_CLASS_COLORS[holding.assetClass] + '20' }]}>
          <Text style={styles.iconText}>
            {holding.symbol?.slice(0, 2).toUpperCase() || holding.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.holdingName}>{holding.name}</Text>
        {holding.symbol && (
          <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{config.label}</Text>
        </View>
      </View>

      {/* Value Card */}
      <View style={styles.valueCard}>
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>Current Value</Text>
          <Text style={styles.valueAmount}>
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.gainRow}>
          {isGain ? (
            <TrendingUp size={18} color={Colors.success} />
          ) : (
            <TrendingDown size={18} color={Colors.danger} />
          )}
          <Text style={[styles.gainText, { color: isGain ? Colors.success : Colors.danger }]}>
            {isGain ? '+' : ''}${gain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' '}({isGain ? '+' : ''}{gainPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsCard}>
          <DetailRow label="Quantity" value={holding.quantity.toString()} />
          <DetailRow
            label="Purchase Price"
            value={`$${holding.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <DetailRow
            label="Current Price"
            value={`$${(holding.currentPrice || holding.purchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <DetailRow
            label="Total Invested"
            value={`$${investedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <DetailRow
            label="Purchase Date"
            value={new Date(holding.purchaseDate).toLocaleDateString()}
            icon={<Calendar size={16} color={Colors.textMuted} />}
          />
          {holding.sector && (
            <DetailRow
              label="Sector"
              value={holding.sector}
              icon={<Tag size={16} color={Colors.textMuted} />}
            />
          )}
          {holding.country && (
            <DetailRow
              label="Country"
              value={holding.country}
              icon={<Globe size={16} color={Colors.textMuted} />}
            />
          )}
          {holding.interestRate && (
            <DetailRow label="Interest Rate" value={`${holding.interestRate}%`} />
          )}
          {holding.maturityDate && (
            <DetailRow
              label="Maturity Date"
              value={new Date(holding.maturityDate).toLocaleDateString()}
            />
          )}
        </View>
      </View>

      {/* Notes */}
      {holding.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <FileText size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.notesText}>{holding.notes}</Text>
          </View>
        </View>
      )}

      {/* Metadata */}
      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          Added {new Date(holding.createdAt).toLocaleDateString()}
        </Text>
        {holding.lastPriceUpdate && (
          <Text style={styles.metadataText}>
            Price updated {new Date(holding.lastPriceUpdate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        {icon}
        <Text style={[styles.detailLabel, icon ? { marginLeft: 8 } : undefined]}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 32,
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
    color: Colors.accent,
    fontSize: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  iconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  holdingSymbol: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  valueCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  valueRow: {
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gainText: {
    fontSize: 16,
    fontWeight: '600',
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  metadata: {
    paddingHorizontal: 16,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
