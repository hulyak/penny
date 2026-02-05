import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Eye,
  Lock,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getCreatorData,
  ModelPortfolio,
  ModelHolding,
  JOSH_PROFILE,
  formatFollowers,
} from '@/lib/creatorHub';

const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: '#4CAF50',
  etf: '#2196F3',
  bond: '#9C27B0',
  gold: '#FFC107',
  crypto: '#FF9800',
  real_estate: '#E91E63',
  cash: '#607D8B',
};

export default function ModelPortfolioScreen() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<ModelPortfolio | null>(null);
  const [copiedHolding, setCopiedHolding] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    const data = await getCreatorData();
    setPortfolio(data.portfolio);
  };

  const handleShare = async () => {
    if (!portfolio) return;

    const holdingsList = portfolio.holdings
      .map((h) => `• ${h.name} (${h.allocationPercent}%)`)
      .join('\n');

    await Share.share({
      message: `${JOSH_PROFILE.name}'s Model Portfolio\n\n${portfolio.description}\n\nHoldings:\n${holdingsList}\n\nTrack your own portfolio with Penny!`,
    });
  };

  const copyHoldingInfo = (holding: ModelHolding) => {
    setCopiedHolding(holding.id);
    setTimeout(() => setCopiedHolding(null), 2000);
    // In a real app, this would copy to clipboard
  };

  if (!portfolio) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Calculate allocation data for chart
  const totalPerformance = portfolio.holdings.reduce(
    (sum, h) => sum + (h.performanceSinceAdded || 0) * (h.allocationPercent / 100),
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Model Portfolio</Text>
        <Pressable style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.accent} />
        </Pressable>
      </View>

      {/* Portfolio Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.viewOnlyBadge}>
            <Eye size={14} color={Colors.accent} />
            <Text style={styles.viewOnlyText}>View-Only</Text>
          </View>
          <View style={styles.followersBadge}>
            <Text style={styles.followersText}>
              {formatFollowers(portfolio.totalFollowers)} following
            </Text>
          </View>
        </View>

        <Text style={styles.portfolioName}>{portfolio.name}</Text>
        <Text style={styles.portfolioDescription}>{portfolio.description}</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Risk Level</Text>
            <View
              style={[
                styles.riskBadge,
                {
                  backgroundColor:
                    portfolio.riskLevel === 'conservative'
                      ? Colors.successMuted
                      : portfolio.riskLevel === 'moderate'
                      ? Colors.warningMuted
                      : Colors.dangerMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.riskText,
                  {
                    color:
                      portfolio.riskLevel === 'conservative'
                        ? Colors.success
                        : portfolio.riskLevel === 'moderate'
                        ? Colors.warning
                        : Colors.danger,
                  },
                ]}
              >
                {portfolio.riskLevel}
              </Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>YTD Return</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              +{portfolio.ytdPerformance?.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Holdings</Text>
            <Text style={styles.statValue}>{portfolio.holdings.length}</Text>
          </View>
        </View>

        {/* Strategy */}
        <View style={styles.strategyBox}>
          <Text style={styles.strategyLabel}>Strategy</Text>
          <Text style={styles.strategyText}>{portfolio.strategy}</Text>
        </View>
      </View>

      {/* Allocation Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allocation</Text>
        <View style={styles.allocationCard}>
          {/* Bar Chart */}
          <View style={styles.allocationBar}>
            {portfolio.holdings.map((holding, index) => (
              <View
                key={holding.id}
                style={[
                  styles.allocationSegment,
                  {
                    backgroundColor: ASSET_TYPE_COLORS[holding.type] || Colors.textMuted,
                    width: `${holding.allocationPercent}%`,
                    borderTopLeftRadius: index === 0 ? 6 : 0,
                    borderBottomLeftRadius: index === 0 ? 6 : 0,
                    borderTopRightRadius: index === portfolio.holdings.length - 1 ? 6 : 0,
                    borderBottomRightRadius: index === portfolio.holdings.length - 1 ? 6 : 0,
                  },
                ]}
              />
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {portfolio.holdings.map((holding) => (
              <View key={holding.id} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: ASSET_TYPE_COLORS[holding.type] || Colors.textMuted },
                  ]}
                />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {holding.symbol || holding.name.split(' ')[0]}
                </Text>
                <Text style={styles.legendPercent}>{holding.allocationPercent}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Holdings List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Holdings</Text>
        {portfolio.holdings.map((holding) => (
          <HoldingCard
            key={holding.id}
            holding={holding}
            isCopied={copiedHolding === holding.id}
            onCopy={() => copyHoldingInfo(holding)}
          />
        ))}
      </View>

      {/* Copy Portfolio Prompt */}
      <View style={styles.copyPrompt}>
        <Lock size={20} color={Colors.textMuted} />
        <View style={styles.copyPromptContent}>
          <Text style={styles.copyPromptTitle}>Want to track this allocation?</Text>
          <Text style={styles.copyPromptText}>
            Create your own portfolio and manually add similar holdings to track your performance.
          </Text>
        </View>
        <Pressable
          style={styles.copyPromptButton}
          onPress={() => router.push('/portfolio/add' as any)}
        >
          <Text style={styles.copyPromptButtonText}>Add Holdings</Text>
        </Pressable>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <AlertTriangle size={16} color={Colors.warning} />
        <Text style={styles.disclaimerText}>{portfolio.disclaimer}</Text>
      </View>

      {/* Last Updated */}
      <Text style={styles.lastUpdated}>
        Last updated: {new Date(portfolio.lastUpdated).toLocaleDateString()}
      </Text>
    </ScrollView>
  );
}

function HoldingCard({
  holding,
  isCopied,
  onCopy,
}: {
  holding: ModelHolding;
  isCopied: boolean;
  onCopy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = (holding.performanceSinceAdded || 0) >= 0;

  return (
    <Pressable style={styles.holdingCard} onPress={() => setExpanded(!expanded)}>
      <View style={styles.holdingHeader}>
        <View
          style={[
            styles.holdingIcon,
            { backgroundColor: ASSET_TYPE_COLORS[holding.type] + '20' },
          ]}
        >
          <Text style={styles.holdingIconText}>
            {holding.symbol?.slice(0, 2) || holding.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.holdingInfo}>
          <Text style={styles.holdingName}>{holding.name}</Text>
          <Text style={styles.holdingType}>{holding.type.replace('_', ' ')}</Text>
        </View>
        <View style={styles.holdingRight}>
          <Text style={styles.holdingAllocation}>{holding.allocationPercent}%</Text>
          {holding.performanceSinceAdded !== undefined && (
            <View style={styles.performanceRow}>
              {isPositive ? (
                <TrendingUp size={12} color={Colors.success} />
              ) : (
                <TrendingDown size={12} color={Colors.danger} />
              )}
              <Text
                style={[
                  styles.performanceText,
                  { color: isPositive ? Colors.success : Colors.danger },
                ]}
              >
                {isPositive ? '+' : ''}
                {holding.performanceSinceAdded.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.holdingExpanded}>
          <View style={styles.reasoningBox}>
            <Info size={14} color={Colors.accent} />
            <Text style={styles.reasoningText}>{holding.reasoning}</Text>
          </View>
          <View style={styles.holdingMeta}>
            <Text style={styles.metaText}>
              Added: {new Date(holding.addedDate).toLocaleDateString()}
            </Text>
            <Pressable style={styles.copyButton} onPress={onCopy}>
              {isCopied ? (
                <Check size={14} color={Colors.success} />
              ) : (
                <Copy size={14} color={Colors.textMuted} />
              )}
              <Text style={[styles.copyText, isCopied && { color: Colors.success }]}>
                {isCopied ? 'Copied!' : 'Copy info'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
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
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  followersBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  followersText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  portfolioName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  portfolioDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  strategyBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
  },
  strategyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strategyText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allocationSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  holdingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  holdingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  holdingType: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingAllocation: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  holdingExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  reasoningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  holdingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  copyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  copyPromptContent: {
    flex: 1,
  },
  copyPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  copyPromptText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  copyPromptButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyPromptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningMuted,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 16,
  },
  lastUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
});
