/**
 * Opik Evaluation Dashboard
 *
 * Shows LLM quality metrics, evaluations, and experiment results
 * for the Penny financial coach AI.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Brain,
  Target,
  Sparkles,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getMetricsSummary,
  getRecentEvaluations,
  MetricsSummary,
  EvaluationResult,
  EvaluationCriteria,
  isOpikConfigured,
} from '@/lib/opikClient';
import {
  getExperimentSummary,
  ALL_EXPERIMENTS,
  Experiment,
} from '@/lib/experiments';

type TabType = 'overview' | 'evaluations' | 'experiments';

export default function OpikDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [recentEvaluations, setRecentEvaluations] = useState<EvaluationResult[]>([]);
  const [experimentSummaries, setExperimentSummaries] = useState<Record<string, any>>({});

  const loadData = useCallback(async () => {
    try {
      const [metricsData, evaluations] = await Promise.all([
        getMetricsSummary(),
        getRecentEvaluations(20),
      ]);

      setMetrics(metricsData);
      setRecentEvaluations(evaluations);

      // Load experiment summaries
      const summaries: Record<string, any> = {};
      for (const exp of ALL_EXPERIMENTS) {
        summaries[exp.id] = await getExperimentSummary(exp.id);
      }
      setExperimentSummaries(summaries);
    } catch (error) {
      console.error('Failed to load Opik data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatScore = (score: number) => (score * 100).toFixed(0) + '%';

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return Colors.success;
    if (score >= 0.6) return Colors.warning;
    return Colors.danger;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp size={14} color={Colors.success} />;
    if (trend === 'declining') return <TrendingDown size={14} color={Colors.danger} />;
    return <Minus size={14} color={Colors.textMuted} />;
  };

  const renderOverview = () => {
    if (!metrics) return null;

    return (
      <View style={styles.tabContent}>
        {/* Overall Score Card */}
        <View style={styles.overallScoreCard}>
          <View style={styles.overallScoreHeader}>
            <Brain size={24} color={Colors.primary} />
            <Text style={styles.overallScoreTitle}>AI Quality Score</Text>
          </View>
          <Text style={[styles.overallScoreValue, { color: getScoreColor(metrics.overallAverageScore) }]}>
            {formatScore(metrics.overallAverageScore)}
          </Text>
          <Text style={styles.overallScoreSubtext}>
            Based on {metrics.totalEvaluations} evaluations
          </Text>
        </View>

        {/* Criteria Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quality Criteria</Text>
          <View style={styles.criteriaGrid}>
            <CriteriaCard
              name="Safety"
              score={metrics.averageScores.safety}
              icon={<Shield size={18} color={getScoreColor(metrics.averageScores.safety)} />}
              description="Avoids investment advice"
            />
            <CriteriaCard
              name="Accuracy"
              score={metrics.averageScores.accuracy}
              icon={<Target size={18} color={getScoreColor(metrics.averageScores.accuracy)} />}
              description="Factually correct"
            />
            <CriteriaCard
              name="Helpfulness"
              score={metrics.averageScores.helpfulness}
              icon={<Sparkles size={18} color={getScoreColor(metrics.averageScores.helpfulness)} />}
              description="Achieves user goals"
            />
            <CriteriaCard
              name="Clarity"
              score={metrics.averageScores.clarity}
              icon={<Brain size={18} color={getScoreColor(metrics.averageScores.clarity)} />}
              description="Easy to understand"
            />
          </View>
        </View>

        {/* Feature Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance by Feature</Text>
          {Object.entries(metrics.scoresByFeature).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No evaluations yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Use the app to generate AI responses and they'll be evaluated automatically
              </Text>
            </View>
          ) : (
            Object.entries(metrics.scoresByFeature).map(([feature, data]) => (
              <View key={feature} style={styles.featureRow}>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>{formatFeatureName(feature)}</Text>
                  <View style={styles.featureMeta}>
                    {getTrendIcon(data.trend)}
                    <Text style={styles.featureCount}>{data.count} evals</Text>
                  </View>
                </View>
                <View style={styles.featureScore}>
                  <Text style={[styles.featureScoreText, { color: getScoreColor(data.averageScore) }]}>
                    {formatScore(data.averageScore)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Opik Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            {isOpikConfigured() ? (
              <>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={styles.statusText}>Opik Cloud connected</Text>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color={Colors.warning} />
                <Text style={styles.statusText}>Running in local mode</Text>
              </>
            )}
          </View>
          <Text style={styles.statusSubtext}>
            Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderEvaluations = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Recent Evaluations</Text>
      {recentEvaluations.length === 0 ? (
        <View style={styles.emptyState}>
          <BarChart3 size={48} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>No evaluations yet</Text>
          <Text style={styles.emptyStateSubtext}>
            AI responses will be automatically evaluated using LLM-as-judge
          </Text>
        </View>
      ) : (
        recentEvaluations.map((evaluation) => (
          <EvaluationCard key={evaluation.id} evaluation={evaluation} />
        ))
      )}
    </View>
  );

  const renderExperiments = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Active Experiments</Text>
      {ALL_EXPERIMENTS.filter(exp => exp.isActive).map((experiment) => {
        const summary = experimentSummaries[experiment.id];
        return (
          <ExperimentCard
            key={experiment.id}
            experiment={experiment}
            summary={summary}
          />
        );
      })}

      <View style={styles.experimentInfoCard}>
        <FlaskConical size={20} color={Colors.textMuted} />
        <Text style={styles.experimentInfoText}>
          Experiments compare different AI coaching styles to find the most effective approach.
          Results are evaluated automatically using LLM-as-judge.
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading evaluation data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Quality Dashboard</Text>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
          <RefreshCw size={20} color={Colors.text} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'evaluations' && styles.tabActive]}
          onPress={() => setActiveTab('evaluations')}
        >
          <Text style={[styles.tabText, activeTab === 'evaluations' && styles.tabTextActive]}>
            Evaluations
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'experiments' && styles.tabActive]}
          onPress={() => setActiveTab('experiments')}
        >
          <Text style={[styles.tabText, activeTab === 'experiments' && styles.tabTextActive]}>
            Experiments
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'evaluations' && renderEvaluations()}
        {activeTab === 'experiments' && renderExperiments()}
      </ScrollView>
    </View>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function CriteriaCard({ name, score, icon, description }: {
  name: string;
  score: number;
  icon: React.ReactNode;
  description: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return Colors.success;
    if (score >= 0.6) return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.criteriaCard}>
      <View style={styles.criteriaIcon}>{icon}</View>
      <Text style={styles.criteriaName}>{name}</Text>
      <Text style={[styles.criteriaScore, { color: getScoreColor(score) }]}>
        {(score * 100).toFixed(0)}%
      </Text>
      <Text style={styles.criteriaDescription}>{description}</Text>
    </View>
  );
}

function EvaluationCard({ evaluation }: { evaluation: EvaluationResult }) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return Colors.success;
    if (score >= 0.6) return Colors.warning;
    return Colors.danger;
  };

  return (
    <Pressable style={styles.evaluationCard} onPress={() => setExpanded(!expanded)}>
      <View style={styles.evaluationHeader}>
        <View style={styles.evaluationInfo}>
          <Text style={styles.evaluationFeature}>{formatFeatureName(evaluation.feature)}</Text>
          <Text style={styles.evaluationTime}>
            {new Date(evaluation.timestamp).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.evaluationScoreBadge, { backgroundColor: getScoreColor(evaluation.overallScore) + '20' }]}>
          <Text style={[styles.evaluationScoreText, { color: getScoreColor(evaluation.overallScore) }]}>
            {(evaluation.overallScore * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.evaluationDetails}>
          <View style={styles.evaluationPrompt}>
            <Text style={styles.evaluationLabel}>Prompt:</Text>
            <Text style={styles.evaluationText} numberOfLines={3}>{evaluation.prompt}</Text>
          </View>
          <View style={styles.evaluationResponse}>
            <Text style={styles.evaluationLabel}>Response:</Text>
            <Text style={styles.evaluationText} numberOfLines={3}>{evaluation.response}</Text>
          </View>
          <View style={styles.evaluationFeedback}>
            <Text style={styles.evaluationLabel}>Feedback:</Text>
            <Text style={styles.evaluationFeedbackText}>{evaluation.feedback}</Text>
          </View>
          <View style={styles.evaluationScores}>
            <ScorePill label="Accuracy" score={evaluation.criteria.accuracy} />
            <ScorePill label="Safety" score={evaluation.criteria.safety} />
            <ScorePill label="Helpful" score={evaluation.criteria.helpfulness} />
            <ScorePill label="Clear" score={evaluation.criteria.clarity} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function ScorePill({ label, score }: { label: string; score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return Colors.success;
    if (score >= 0.6) return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={[styles.scorePill, { backgroundColor: getScoreColor(score) + '20' }]}>
      <Text style={[styles.scorePillText, { color: getScoreColor(score) }]}>
        {label}: {(score * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

function ExperimentCard({ experiment, summary }: { experiment: Experiment; summary: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={styles.experimentCard} onPress={() => setExpanded(!expanded)}>
      <View style={styles.experimentHeader}>
        <FlaskConical size={20} color={Colors.primary} />
        <View style={styles.experimentInfo}>
          <Text style={styles.experimentName}>{experiment.name}</Text>
          <Text style={styles.experimentDescription}>{experiment.description}</Text>
        </View>
        {summary?.statisticalSignificance && (
          <View style={styles.significanceBadge}>
            <Text style={styles.significanceBadgeText}>Significant</Text>
          </View>
        )}
      </View>

      {expanded && summary && (
        <View style={styles.experimentVariants}>
          {experiment.variants.map((variant) => {
            const results = summary.variantResults?.[variant.id];
            const isWinner = summary.winningVariant === variant.id;

            return (
              <View
                key={variant.id}
                style={[styles.variantRow, isWinner && styles.variantRowWinner]}
              >
                <View style={styles.variantInfo}>
                  <Text style={styles.variantName}>
                    {variant.name}
                    {isWinner && ' 🏆'}
                  </Text>
                  <Text style={styles.variantCount}>
                    {results?.count || 0} samples
                  </Text>
                </View>
                <View style={styles.variantScore}>
                  <Text style={[
                    styles.variantScoreText,
                    { color: results?.averageScore >= 0.7 ? Colors.success : Colors.text }
                  ]}>
                    {results?.averageScore ? (results.averageScore * 100).toFixed(0) + '%' : '--'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },

  // Overall Score Card
  overallScoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  overallScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  overallScoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  overallScoreValue: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 4,
  },
  overallScoreSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Criteria Grid
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  criteriaCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  criteriaIcon: {
    marginBottom: 8,
  },
  criteriaName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  criteriaScore: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  criteriaDescription: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Feature Rows
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  featureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featureScore: {
    marginLeft: 12,
  },
  featureScoreText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Status Card
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.text,
  },
  statusSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Empty State
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Evaluation Card
  evaluationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  evaluationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evaluationInfo: {
    flex: 1,
  },
  evaluationFeature: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  evaluationTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  evaluationScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  evaluationScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  evaluationDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  evaluationPrompt: {
    marginBottom: 10,
  },
  evaluationResponse: {
    marginBottom: 10,
  },
  evaluationFeedback: {
    marginBottom: 10,
  },
  evaluationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  evaluationText: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  evaluationFeedbackText: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  evaluationScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scorePillText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Experiment Card
  experimentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  experimentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  experimentInfo: {
    flex: 1,
  },
  experimentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  experimentDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  significanceBadge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  significanceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.success,
  },
  experimentVariants: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
  },
  variantRowWinner: {
    backgroundColor: Colors.successMuted,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  variantCount: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  variantScore: {
    marginLeft: 12,
  },
  variantScoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  experimentInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },
  experimentInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
});
