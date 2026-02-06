import React, { useState, useEffect, useMemo } from 'react';
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
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  PieChart,
  Globe,
  Briefcase,
  RefreshCw,
  Share2,
  Lock,
  Crown,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Holding, ASSET_CLASS_COLORS, AssetClass, RebalancePlan, PeerComparison, MarketEvent } from '@/types';
import {
  getAIAnalysis,
  getQuickAnalysis,
  calculateMetrics,
  AIAnalysisResult,
  PortfolioMetrics,
} from '@/lib/portfolioAnalysis';
import { generateRebalanceActions, getAIRebalanceRecommendations } from '@/lib/rebalanceService';
import { getPeerComparison } from '@/lib/communityBenchmarks';
import { getUpcomingEvents, getNewsAnalysis } from '@/lib/marketEvents';
import { PortfolioReportCard } from '@/components/PortfolioReportCard';
import { PeerBenchmark, generateBenchmarkMetrics } from '@/components/PeerBenchmark';
import { RebalanceCard } from '@/components/RebalanceCard';
import { CommunityBenchmarkCard } from '@/components/CommunityBenchmarkCard';
import { MarketEventsCard } from '@/components/MarketEventsCard';
import { usePurchases } from '@/context/PurchasesContext';
import { PremiumBadge, PremiumCard } from '@/components/PremiumBadge';
import portfolioService from '@/lib/portfolioService';

export default function AnalysisScreen() {
  const router = useRouter();
  const { isPremium, showPaywall } = usePurchases();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [showReportCard, setShowReportCard] = useState(false);

  // New feature states
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlan | null>(null);
  const [peerComparison, setPeerComparison] = useState<PeerComparison | null>(null);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [newsAnalysis, setNewsAnalysis] = useState<{
    headlines: { title: string; summary: string; impact: 'positive' | 'neutral' | 'negative'; relevantSymbols: string[] }[];
    marketSentiment: 'bullish' | 'neutral' | 'bearish';
    keyTakeaway: string;
  } | null>(null);
  const [isLoadingRebalance, setIsLoadingRebalance] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Calculate data for virality features
  const viralityData = useMemo(() => {
    if (!metrics || !analysis) return null;

    // Get allocation data
    const allocation = Object.entries(metrics.assetClassDistribution).map(([assetClass, data]) => ({
      assetClass: assetClass as AssetClass,
      percent: data.percent,
    }));

    // Count unique sectors and countries
    const sectors = new Set(holdings.map((h) => h.sector).filter(Boolean));
    const countries = new Set(holdings.map((h) => h.country).filter(Boolean));

    // Generate benchmark metrics
    const userAllocation = {
      equity: metrics.assetClassDistribution.equity?.percent || 0,
      debt: metrics.assetClassDistribution.debt?.percent || 0,
      commodity: metrics.assetClassDistribution.commodity?.percent || 0,
      realAsset: metrics.assetClassDistribution.real_asset?.percent || 0,
      cash: metrics.assetClassDistribution.cash?.percent || 0,
    };

    const benchmarkMetrics = generateBenchmarkMetrics(
      userAllocation,
      holdings.length,
      sectors.size || 1,
      countries.size || 1
    );

    return {
      allocation,
      sectorCount: sectors.size || 1,
      countryCount: countries.size || 1,
      benchmarkMetrics,
    };
  }, [metrics, analysis, holdings]);

  const loadData = async () => {
    try {
      const loadedHoldings = await portfolioService.getHoldings();
      if (loadedHoldings.length > 0) {
        setHoldings(loadedHoldings);
        const calculatedMetrics = calculateMetrics(loadedHoldings);
        setMetrics(calculatedMetrics);

        // Get quick analysis first
        const quickAnalysis = getQuickAnalysis(loadedHoldings);
        setAnalysis(quickAnalysis);

        // Load rebalancing plan
        const plan = generateRebalanceActions(loadedHoldings, 'moderate');
        setRebalancePlan(plan);

        // Load peer comparison
        const comparison = getPeerComparison(loadedHoldings, 30); // Default age 30
        setPeerComparison(comparison);

        // Load market events
        const events = getUpcomingEvents(loadedHoldings, 30);
        setMarketEvents(events);

        // Load news analysis in background
        loadNewsAnalysis(loadedHoldings);
      }
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNewsAnalysis = async (holdingsToAnalyze: Holding[]) => {
    setIsLoadingNews(true);
    try {
      const news = await getNewsAnalysis(holdingsToAnalyze);
      setNewsAnalysis(news);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  const refreshRebalancePlan = async () => {
    if (holdings.length === 0) return;

    setIsLoadingRebalance(true);
    try {
      if (isPremium) {
        const aiPlan = await getAIRebalanceRecommendations(holdings, 'moderate');
        setRebalancePlan(aiPlan);
      } else {
        const plan = generateRebalanceActions(holdings, 'moderate');
        setRebalancePlan(plan);
      }
    } catch (error) {
      console.error('Failed to refresh rebalance plan:', error);
    } finally {
      setIsLoadingRebalance(false);
    }
  };

  const runAIAnalysis = async () => {
    if (holdings.length === 0) {
      console.log('[Analysis] No holdings to analyze');
      return;
    }

    // Check premium status for AI analysis
    if (!isPremium) {
      console.log('[Analysis] Not premium, showing paywall');
      showPaywall();
      return;
    }

    console.log('[Analysis] Starting AI analysis...');
    setIsAnalyzing(true);
    try {
      const aiAnalysis = await getAIAnalysis(holdings);
      console.log('[Analysis] AI analysis complete');
      setAnalysis(aiAnalysis);
      setUseAI(true);
    } catch (error) {
      console.error('[Analysis] AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (useAI) {
      await runAIAnalysis();
    }
    setRefreshing(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return Colors.success;
      case 'moderate':
        return Colors.warning;
      case 'high':
        return Colors.coral;
      case 'very_high':
        return Colors.danger;
      default:
        return Colors.textMuted;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return Colors.success;
    if (score >= 50) return Colors.warning;
    if (score >= 30) return Colors.coral;
    return Colors.danger;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (holdings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Portfolio Analysis</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <PieChart size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No holdings to analyze</Text>
          <Text style={styles.emptyText}>
            Add some investments to your portfolio to see analysis and insights
          </Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/portfolio/add' as any)}
          >
            <Text style={styles.addButtonText}>Add Holdings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Portfolio Analysis</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={runAIAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <RefreshCw size={20} color={Colors.accent} />
          )}
        </Pressable>
      </View>

      {/* Diversification Score - Available to all users */}
      {analysis && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Shield size={24} color={getScoreColor(analysis.diversificationScore)} />
            <Text style={styles.scoreTitle}>Diversification Score</Text>
            {!isPremium && <PremiumBadge size="small" onPress={showPaywall} />}
          </View>
          <View style={styles.scoreRow}>
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getScoreColor(analysis.diversificationScore) },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumber,
                  { color: getScoreColor(analysis.diversificationScore) },
                ]}
              >
                {analysis.diversificationScore}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
            <View style={styles.scoreInfo}>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: getRiskColor(analysis.riskLevel) + '20' },
                ]}
              >
                <Text
                  style={[styles.riskBadgeText, { color: getRiskColor(analysis.riskLevel) }]}
                >
                  {analysis.riskLevel.replace('_', ' ').toUpperCase()} RISK
                </Text>
              </View>
              <Text style={styles.scoreSummary}>{analysis.summary}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Asset Allocation */}
      {metrics && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Asset Allocation</Text>
          </View>
          <View style={styles.allocationCard}>
            <View style={styles.allocationBar}>
              {Object.entries(metrics.assetClassDistribution).map(([cls, data], index, arr) => (
                <View
                  key={cls}
                  style={[
                    styles.allocationSegment,
                    {
                      backgroundColor: ASSET_CLASS_COLORS[cls as AssetClass] || Colors.textMuted,
                      width: `${data.percent}%`,
                      borderTopLeftRadius: index === 0 ? 6 : 0,
                      borderBottomLeftRadius: index === 0 ? 6 : 0,
                      borderTopRightRadius: index === arr.length - 1 ? 6 : 0,
                      borderBottomRightRadius: index === arr.length - 1 ? 6 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.allocationLegend}>
              {Object.entries(metrics.assetClassDistribution).map(([cls, data]) => (
                <View key={cls} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: ASSET_CLASS_COLORS[cls as AssetClass] || Colors.textMuted },
                    ]}
                  />
                  <Text style={styles.legendLabel}>
                    {cls.charAt(0).toUpperCase() + cls.slice(1).replace('_', ' ')}
                  </Text>
                  <Text style={styles.legendPercent}>{data.percent.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Concentration Risks - Premium Feature */}
      {analysis && analysis.concentrationRisks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Concentration Risks</Text>
            {!isPremium && <Lock size={16} color={Colors.textMuted} />}
          </View>
          {isPremium ? (
            analysis.concentrationRisks.map((risk, index) => (
              <View key={index} style={styles.riskCard}>
                <View style={styles.riskIcon}>
                  <AlertTriangle size={16} color={Colors.warning} />
                </View>
                <View style={styles.riskContent}>
                  <Text style={styles.riskName}>{risk.name}</Text>
                  <Text style={styles.riskWarning}>{risk.warning}</Text>
                </View>
                <Text style={styles.riskPercent}>{risk.percent.toFixed(0)}%</Text>
              </View>
            ))
          ) : (
            <Pressable style={styles.lockedSection} onPress={showPaywall}>
              <Lock size={20} color={Colors.textMuted} />
              <Text style={styles.lockedText}>
                {analysis.concentrationRisks.length} risk{analysis.concentrationRisks.length > 1 ? 's' : ''} identified
              </Text>
              <Text style={styles.lockedCta}>Upgrade to view</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Strengths */}
      {analysis && analysis.strengths.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={20} color={Colors.success} />
            <Text style={styles.sectionTitle}>Strengths</Text>
          </View>
          <View style={styles.listCard}>
            {analysis.strengths.map((strength, index) => (
              <View key={index} style={styles.listItem}>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={styles.listText}>{strength}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Concerns - Premium Feature */}
      {analysis && analysis.concerns.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color={Colors.coral} />
            <Text style={styles.sectionTitle}>Areas for Improvement</Text>
            {!isPremium && <Lock size={16} color={Colors.textMuted} />}
          </View>
          {isPremium ? (
            <View style={styles.listCard}>
              {analysis.concerns.map((concern, index) => (
                <View key={index} style={styles.listItem}>
                  <AlertTriangle size={16} color={Colors.coral} />
                  <Text style={styles.listText}>{concern}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={styles.lockedSection} onPress={showPaywall}>
              <Lock size={20} color={Colors.textMuted} />
              <Text style={styles.lockedText}>
                {analysis.concerns.length} improvement{analysis.concerns.length > 1 ? 's' : ''} suggested
              </Text>
              <Text style={styles.lockedCta}>Upgrade to view</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Recommendations - Premium Feature */}
      {analysis && analysis.recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {!isPremium && <Lock size={16} color={Colors.textMuted} />}
          </View>
          {isPremium ? (
            <View style={styles.listCard}>
              {analysis.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={styles.lockedSection} onPress={showPaywall}>
              <Lock size={20} color={Colors.textMuted} />
              <Text style={styles.lockedText}>
                {analysis.recommendations.length} recommendation{analysis.recommendations.length > 1 ? 's' : ''} available
              </Text>
              <Text style={styles.lockedCta}>Upgrade to view</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Rebalancing Actions - NEW */}
      {holdings.length >= 2 && (
        <View style={styles.section}>
          <RebalanceCard
            plan={rebalancePlan}
            isLoading={isLoadingRebalance}
            onRefresh={refreshRebalancePlan}
            riskTolerance="moderate"
          />
        </View>
      )}

      {/* Community Benchmarks - NEW */}
      {holdings.length >= 1 && (
        <View style={styles.section}>
          <CommunityBenchmarkCard
            comparison={peerComparison}
            isLoading={isLoading}
          />
        </View>
      )}

      {/* Market Events & News - NEW */}
      {holdings.length >= 1 && (
        <View style={styles.section}>
          <MarketEventsCard
            events={marketEvents}
            newsAnalysis={newsAnalysis || undefined}
            onViewAll={() => router.push('/portfolio/alerts' as any)}
          />
        </View>
      )}

      {/* Legacy Peer Benchmark */}
      {viralityData && (
        <View style={styles.section}>
          <PeerBenchmark metrics={viralityData.benchmarkMetrics} />
        </View>
      )}

      {/* Portfolio Report Card */}
      {analysis && viralityData && (
        <View style={styles.section}>
          <Pressable
            style={styles.shareReportButton}
            onPress={() => setShowReportCard(!showReportCard)}
          >
            <Share2 size={20} color={Colors.accent} />
            <Text style={styles.shareReportButtonText}>
              {showReportCard ? 'Hide Report Card' : 'Share Portfolio Report Card'}
            </Text>
          </Pressable>

          {showReportCard && (
            <PortfolioReportCard
              holdings={holdings}
              diversificationScore={analysis.diversificationScore}
              riskLevel={analysis.riskLevel}
              assetClassCount={Object.keys(metrics?.assetClassDistribution || {}).length}
              sectorCount={viralityData.sectorCount}
              countryCount={viralityData.countryCount}
              topStrength={analysis.strengths[0]}
              topConcern={analysis.concerns[0]}
              allocation={viralityData.allocation}
            />
          )}
        </View>
      )}

      {/* AI Analysis Button */}
      {!isAnalyzing && (
        <Pressable style={styles.aiButton} onPress={runAIAnalysis}>
          {!isPremium && <Crown size={18} color={Colors.warning} style={{ marginRight: 4 }} />}
          <TrendingUp size={20} color={Colors.textLight} />
          <Text style={styles.aiButtonText}>
            {isPremium ? 'Get AI-Powered Insights' : 'Unlock AI Analysis'}
          </Text>
        </Pressable>
      )}

      {/* Premium Upsell Card for Free Users */}
      {!isPremium && (
        <View style={styles.section}>
          <PremiumCard
            title="Unlock Full Analysis"
            description="Get detailed risk analysis, personalized recommendations, peer benchmarks, and AI-powered insights to optimize your portfolio."
            onUpgrade={showPaywall}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Analysis is for informational purposes only and should not be considered financial advice.
        </Text>
      </View>
    </ScrollView>
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
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  addButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scoreCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scoreInfo: {
    flex: 1,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
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
  allocationLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningMuted,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  riskIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riskContent: {
    flex: 1,
  },
  riskName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  riskWarning: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  riskPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
  },

  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },

  shareReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginBottom: 16,
  },
  shareReportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  lockedSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  lockedCta: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 4,
  },
});
