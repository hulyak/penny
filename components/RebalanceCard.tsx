import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { RebalancePlan, RebalanceAction, AssetClass } from '@/types';

interface Props {
  plan: RebalancePlan | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  equity: Colors.success,
  debt: Colors.blue,
  commodity: Colors.gold,
  real_asset: Colors.purple,
  cash: Colors.textSecondary,
};

export function RebalanceCard({ plan, isLoading, onRefresh, riskTolerance = 'moderate' }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <RefreshCw size={20} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Rebalancing Analysis</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Analyzing your portfolio...</Text>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <RefreshCw size={20} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Rebalancing Analysis</Text>
        </View>
        <Text style={styles.emptyText}>Add more holdings to get rebalancing suggestions</Text>
      </View>
    );
  }

  const hasActions = plan.actions.length > 0;
  const buyActions = plan.actions.filter((a) => a.type === 'buy');
  const sellActions = plan.actions.filter((a) => a.type === 'sell');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <RefreshCw size={20} color={Colors.accent} />
          </View>
          <View>
            <Text style={styles.title}>Rebalancing Actions</Text>
            <Text style={styles.subtitle}>
              {riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1)} target allocation
            </Text>
          </View>
        </View>
        {onRefresh && (
          <Pressable onPress={onRefresh} style={styles.refreshButton}>
            <RefreshCw size={16} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        {hasActions ? (
          <>
            <AlertTriangle size={18} color={Colors.warning} />
            <Text style={styles.summaryText}>{plan.summary}</Text>
          </>
        ) : (
          <>
            <CheckCircle size={18} color={Colors.success} />
            <Text style={styles.summaryText}>{plan.summary}</Text>
          </>
        )}
      </View>

      {/* Quick Stats */}
      {hasActions && (
        <View style={styles.statsRow}>
          {sellActions.length > 0 && (
            <View style={[styles.statBadge, { backgroundColor: Colors.dangerMuted }]}>
              <ArrowDownRight size={14} color={Colors.danger} />
              <Text style={[styles.statText, { color: Colors.danger }]}>
                Sell ${sellActions.reduce((s, a) => s + a.actionAmount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Text>
            </View>
          )}
          {buyActions.length > 0 && (
            <View style={[styles.statBadge, { backgroundColor: Colors.successMuted }]}>
              <ArrowUpRight size={14} color={Colors.success} />
              <Text style={[styles.statText, { color: Colors.success }]}>
                Buy ${buyActions.reduce((s, a) => s + a.actionAmount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expandable Actions List */}
      {hasActions && (
        <>
          <Pressable style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
            <Text style={styles.expandText}>
              {expanded ? 'Hide Details' : `View ${plan.actions.length} Action${plan.actions.length > 1 ? 's' : ''}`}
            </Text>
            {expanded ? (
              <ChevronUp size={18} color={Colors.accent} />
            ) : (
              <ChevronDown size={18} color={Colors.accent} />
            )}
          </Pressable>

          {expanded && (
            <View style={styles.actionsList}>
              {plan.actions.map((action) => (
                <ActionRow key={action.id} action={action} />
              ))}
            </View>
          )}
        </>
      )}

      {/* Target Allocation */}
      <View style={styles.allocationSection}>
        <Text style={styles.allocationTitle}>Target vs Current Allocation</Text>
        <View style={styles.allocationBars}>
          {Object.entries(plan.targetAllocation).map(([assetClass, target]) => {
            const current = plan.currentAllocation[assetClass as AssetClass] || 0;
            const diff = current - target;
            return (
              <View key={assetClass} style={styles.allocationRow}>
                <View style={styles.allocationLabel}>
                  <View style={[styles.allocationDot, { backgroundColor: ASSET_CLASS_COLORS[assetClass as AssetClass] }]} />
                  <Text style={styles.allocationName}>
                    {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                  </Text>
                </View>
                <View style={styles.allocationValues}>
                  <Text style={styles.currentValue}>{current.toFixed(0)}%</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.targetValue}>{target}%</Text>
                  {Math.abs(diff) >= 3 && (
                    <Text style={[styles.diffValue, { color: diff > 0 ? Colors.danger : Colors.success }]}>
                      ({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ActionRow({ action }: { action: RebalanceAction }) {
  const isBuy = action.type === 'buy';

  return (
    <View style={styles.actionRow}>
      <View style={[styles.actionIcon, { backgroundColor: isBuy ? Colors.successMuted : Colors.dangerMuted }]}>
        {isBuy ? (
          <ArrowUpRight size={16} color={Colors.success} />
        ) : (
          <ArrowDownRight size={16} color={Colors.danger} />
        )}
      </View>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>
          {isBuy ? 'Buy' : 'Sell'} {action.holdingName}
        </Text>
        <Text style={styles.actionReason}>{action.reason}</Text>
      </View>
      <View style={styles.actionAmount}>
        <Text style={[styles.amountText, { color: isBuy ? Colors.success : Colors.danger }]}>
          ${action.actionAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </Text>
        {action.actionShares && (
          <Text style={styles.sharesText}>{action.actionShares} shares</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  actionsList: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionReason: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sharesText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  allocationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  allocationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allocationBars: {
    gap: 8,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allocationName: {
    fontSize: 14,
    color: Colors.text,
  },
  allocationValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    width: 35,
    textAlign: 'right',
  },
  arrow: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    width: 35,
    textAlign: 'right',
  },
  diffValue: {
    fontSize: 12,
    fontWeight: '500',
    width: 45,
    textAlign: 'right',
  },
});
