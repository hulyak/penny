import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  Scissors,
  ShieldCheck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { usePurchases } from '@/context/PurchasesContext';
import { PremiumCard } from '@/components/PremiumBadge';
import portfolioService from '@/lib/portfolioService';
import { analyzeTaxLossHarvesting, TaxLossSummary, TaxLossOpportunity } from '@/lib/taxLossHarvesting';
import { Holding } from '@/types';

export default function TaxLossScreen() {
  const router = useRouter();
  const { isPremium, showPaywall } = usePurchases();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<TaxLossSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await portfolioService.getHoldings();
      setHoldings(data);
      const analysis = analyzeTaxLossHarvesting(data);
      setSummary(analysis);
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Tax Loss Harvesting</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.premiumGate}>
          <Scissors size={48} color={Colors.primary} />
          <Text style={styles.premiumTitle}>Tax Loss Harvesting</Text>
          <Text style={styles.premiumSubtitle}>
            Identify holdings with unrealized losses you can sell to offset capital gains and reduce your tax bill.
          </Text>
          <PremiumCard
            title="Unlock Tax Optimization"
            description="Upgrade to Pro to access tax loss harvesting alerts and save on taxes."
            onUpgrade={showPaywall}
          />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Tax Loss Harvesting</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing your holdings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Tax Loss Harvesting</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Summary Cards */}
        {summary && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <TrendingDown size={20} color={Colors.danger} />
                <Text style={styles.summaryLabel}>Unrealized Losses</Text>
                <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                  -${summary.totalUnrealizedLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <DollarSign size={20} color={Colors.success} />
                <Text style={styles.summaryLabel}>Est. Tax Savings</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                  ${summary.estimatedTaxSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Info size={18} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How Tax Loss Harvesting Works</Text>
                <Text style={styles.infoText}>
                  Sell holdings at a loss to offset capital gains from other investments. You can also deduct up to $3,000 of net losses against ordinary income. Be aware of the wash sale rule: avoid repurchasing substantially identical securities within 30 days.
                </Text>
              </View>
            </View>

            {/* Gains vs Losses Overview */}
            <View style={styles.overviewCard}>
              <Text style={styles.sectionTitle}>Tax Position Overview</Text>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>Unrealized Gains</Text>
                <Text style={[styles.overviewValue, { color: Colors.success }]}>
                  +${summary.totalUnrealizedGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>Unrealized Losses</Text>
                <Text style={[styles.overviewValue, { color: Colors.danger }]}>
                  -${summary.totalUnrealizedLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.overviewRow, styles.overviewRowLast]}>
                <Text style={[styles.overviewLabel, { fontWeight: '700' }]}>Net Position</Text>
                <Text style={[styles.overviewValue, { fontWeight: '700', color: summary.netPosition >= 0 ? Colors.success : Colors.danger }]}>
                  {summary.netPosition >= 0 ? '+' : '-'}${Math.abs(summary.netPosition).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Opportunities */}
            <Text style={styles.sectionTitle}>
              Harvesting Opportunities ({summary.harvestableCount})
            </Text>

            {summary.opportunities.length === 0 ? (
              <View style={styles.emptyCard}>
                <ShieldCheck size={40} color={Colors.success} />
                <Text style={styles.emptyTitle}>No Losses to Harvest</Text>
                <Text style={styles.emptySubtitle}>
                  All your holdings are in the green. Check back when market conditions change.
                </Text>
              </View>
            ) : (
              summary.opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.holding.id}
                  opportunity={opp}
                  onPress={() => router.push(`/portfolio/${opp.holding.id}` as any)}
                />
              ))
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <AlertTriangle size={16} color={Colors.gold} />
              <Text style={styles.disclaimerText}>
                This is for informational purposes only and does not constitute tax advice. Consult a tax professional before making investment decisions based on tax considerations.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function OpportunityCard({ opportunity, onPress }: { opportunity: TaxLossOpportunity; onPress: () => void }) {
  const { holding, unrealizedLoss, lossPercent, holdingPeriod, daysSincepurchase, potentialTaxSavings } = opportunity;
  const taxRate = holdingPeriod === 'short_term' ? '32%' : '15%';

  return (
    <Pressable style={styles.opportunityCard} onPress={onPress}>
      <View style={styles.opportunityHeader}>
        <View>
          <Text style={styles.opportunityName}>{holding.name}</Text>
          <Text style={styles.opportunitySymbol}>{holding.symbol || holding.type}</Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </View>

      <View style={styles.opportunityGrid}>
        <View style={styles.opportunityItem}>
          <Text style={styles.opportunityItemLabel}>Unrealized Loss</Text>
          <Text style={[styles.opportunityItemValue, { color: Colors.danger }]}>
            -${unrealizedLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.opportunityItemSub, { color: Colors.danger }]}>
            {lossPercent.toFixed(2)}%
          </Text>
        </View>

        <View style={styles.opportunityItem}>
          <Text style={styles.opportunityItemLabel}>Holding Period</Text>
          <Text style={styles.opportunityItemValue}>
            {holdingPeriod === 'short_term' ? 'Short-term' : 'Long-term'}
          </Text>
          <Text style={styles.opportunityItemSub}>{daysSincepurchase} days</Text>
        </View>

        <View style={styles.opportunityItem}>
          <Text style={styles.opportunityItemLabel}>Est. Tax Savings</Text>
          <Text style={[styles.opportunityItemValue, { color: Colors.success }]}>
            ${potentialTaxSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.opportunityItemSub}>@ {taxRate} rate</Text>
        </View>
      </View>
    </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  overviewRowLast: {
    borderBottomWidth: 0,
  },
  overviewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  opportunityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  opportunityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  opportunitySymbol: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  opportunityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  opportunityItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  opportunityItemLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  opportunityItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  opportunityItemSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.goldMuted,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
