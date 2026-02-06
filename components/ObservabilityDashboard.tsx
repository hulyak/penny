/**
 * Observability Dashboard Component
 *
 * Displays metrics, evaluation scores, and analytics
 * for monitoring Penny's AI performance.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  BarChart2,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Brain,
  Bot,
  Bell,
  Target,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import logger from '@/lib/logger';
import { getAnalyticsSummary, getEvaluationMetrics, AnalyticsSummary } from '@/lib/analytics';
import { isOpikConfigured } from '@/lib/opik';
import { getAgentAnalytics, triggerAgentCheck, type Intervention, type AgentState } from '@/lib/agentLoop';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DashboardData {
  analytics: AnalyticsSummary | null;
  evaluations: {
    averageScores: Record<string, number>;
    scoreDistribution: Record<string, number[]>;
    recentEvaluations: Array<{ timestamp: string; metric: string; score: number }>;
  } | null;
  agent: {
    state: AgentState;
    recentInterventions: Intervention[];
    responseRate: number;
    effectiveTypes: string[];
  } | null;
}

export function ObservabilityDashboard() {
  const [data, setData] = useState<DashboardData>({ analytics: null, evaluations: null, agent: null });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'monitor' | 'quality' | 'feedback'>('overview');

  const loadData = async () => {
    try {
      const [analytics, evaluations, agent] = await Promise.all([
        getAnalyticsSummary(),
        getEvaluationMetrics(),
        getAgentAnalytics(),
      ]);
      setData({ analytics, evaluations, agent });
    } catch (error) {
      logger.error('Dashboard', 'Error loading data', { error });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const { analytics, evaluations } = data;

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
        <View style={styles.headerIcon}>
          <BarChart2 size={24} color={Colors.accent} />
        </View>
        <View>
          <Text style={styles.headerTitle}>App Activity</Text>
          <Text style={styles.headerSubtitle}>
            {isOpikConfigured() ? 'Cloud sync enabled' : 'Tracking locally'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'monitor', label: 'Monitor' },
          { key: 'quality', label: 'Quality' },
          { key: 'feedback', label: 'Feedback' },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard
              icon={<Zap size={20} color={Colors.accent} />}
              label="AI Calls"
              value={analytics?.aiCallStats.total || 0}
              subtitle={`${(analytics?.aiCallStats.averageLatency || 0).toFixed(0)}ms avg`}
            />
            <MetricCard
              icon={<Activity size={20} color={Colors.success} />}
              label="Interactions"
              value={analytics?.totalInteractions || 0}
              subtitle={`${analytics?.totalSessions || 0} sessions`}
            />
            <MetricCard
              icon={<ThumbsUp size={20} color={Colors.success} />}
              label="Helpful"
              value={analytics?.feedbackStats.helpful || 0}
              subtitle={`${analytics?.feedbackStats.notHelpful || 0} not helpful`}
            />
            <MetricCard
              icon={<AlertTriangle size={20} color={Colors.warning} />}
              label="Error Rate"
              value={`${((analytics?.aiCallStats.errorRate || 0) * 100).toFixed(1)}%`}
              subtitle="of AI calls"
            />
          </View>

          {/* Engagement Trend */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>7-Day Engagement</Text>
            <View style={styles.chartContainer}>
              {analytics?.engagementTrend.map((day, index) => (
                <View key={day.date} style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: Math.max(4, (day.interactions / Math.max(...analytics.engagementTrend.map(d => d.interactions), 1)) * 80),
                      },
                    ]}
                  />
                  <Text style={styles.chartLabel}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Feature Usage */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Feature Usage</Text>
            {Object.entries(analytics?.featureUsage || {}).length === 0 ? (
              <Text style={styles.emptyText}>No feature usage data yet</Text>
            ) : (
              Object.entries(analytics?.featureUsage || {}).slice(0, 5).map(([feature, count]) => (
                <View key={feature} style={styles.featureRow}>
                  <Text style={styles.featureName}>{feature}</Text>
                  <View style={styles.featureBar}>
                    <View
                      style={[
                        styles.featureBarFill,
                        {
                          width: `${(count / Math.max(...Object.values(analytics?.featureUsage || { a: 1 }))) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.featureCount}>{count}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {activeTab === 'monitor' && (
        <>
          {/* Monitor Status */}
          <View style={styles.card}>
            <View style={styles.agentHeader}>
              <View style={styles.agentIcon}>
                <Bot size={24} color={Colors.accent} />
              </View>
              <View style={styles.agentInfo}>
                <Text style={styles.cardTitle}>Portfolio Monitor</Text>
                <Text style={styles.agentStatus}>
                  Last check: {data.agent?.state.lastCheck
                    ? new Date(data.agent.state.lastCheck).toLocaleString()
                    : 'Never'}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.triggerButton}
              onPress={async () => {
                await triggerAgentCheck();
                await loadData();
              }}
            >
              <Zap size={16} color={Colors.textLight} />
              <Text style={styles.triggerButtonText}>Run Check Now</Text>
            </Pressable>
          </View>

          {/* Monitor Metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard
              icon={<Bell size={20} color={Colors.coral} />}
              label="Alerts Sent"
              value={data.agent?.state.weeklyInterventionCount || 0}
              subtitle="this week"
            />
            <MetricCard
              icon={<Target size={20} color={Colors.success} />}
              label="Response Rate"
              value={`${((data.agent?.responseRate || 0) * 100).toFixed(0)}%`}
              subtitle="how often you engage"
            />
          </View>

          {/* Personalization */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personalization</Text>
            <View style={styles.learningItem}>
              <Text style={styles.learningLabel}>Best time to notify you</Text>
              <Text style={styles.learningValue}>
                {data.agent?.state.preferredInterventionHour || 9}:00
              </Text>
            </View>
            <View style={styles.learningItem}>
              <Text style={styles.learningLabel}>Alert types that work for you</Text>
              <View style={styles.typeTags}>
                {(data.agent?.effectiveTypes || ['drift_alert', 'contribution_reminder']).map((type) => (
                  <View key={type} style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{type.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Recent Alerts */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Alerts</Text>
            {(data.agent?.recentInterventions || []).length === 0 ? (
              <Text style={styles.emptyText}>No alerts sent yet. We'll notify you when something important happens.</Text>
            ) : (
              (data.agent?.recentInterventions || []).slice(-5).reverse().map((intervention) => (
                <View key={intervention.id} style={styles.interventionRow}>
                  <View style={styles.interventionInfo}>
                    <Text style={styles.interventionTitle}>{intervention.title}</Text>
                    <Text style={styles.interventionMessage} numberOfLines={1}>
                      {intervention.message}
                    </Text>
                    <Text style={styles.interventionTime}>
                      {new Date(intervention.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.interventionStatus,
                      { backgroundColor: intervention.responded ? Colors.successMuted : Colors.warningMuted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.interventionStatusText,
                        { color: intervention.responded ? Colors.success : Colors.warning },
                      ]}
                    >
                      {intervention.responded ? 'Responded' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {activeTab === 'quality' && (
        <>
          {/* Average Scores */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Quality Scores</Text>
            {Object.entries(evaluations?.averageScores || {}).length === 0 ? (
              <Text style={styles.emptyText}>No quality checks yet</Text>
            ) : (
              Object.entries(evaluations?.averageScores || {}).map(([metric, score]) => (
                <View key={metric} style={styles.scoreRow}>
                  <View style={styles.scoreLabel}>
                    <ScoreIcon score={score} />
                    <Text style={styles.scoreName}>
                      {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                  <View style={styles.scoreBarContainer}>
                    <View style={styles.scoreBar}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          {
                            width: `${score * 100}%`,
                            backgroundColor: getScoreColor(score),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
                      {(score * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Recent Checks */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent AI Checks</Text>
            {(evaluations?.recentEvaluations || []).length === 0 ? (
              <Text style={styles.emptyText}>No checks yet</Text>
            ) : (
              (evaluations?.recentEvaluations || []).slice(0, 10).map((evaluation, index) => (
                <View key={index} style={styles.evaluationRow}>
                  <View style={styles.evaluationInfo}>
                    <Text style={styles.evaluationMetric}>
                      {evaluation.metric.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.evaluationTime}>
                      {new Date(evaluation.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.evaluationScore,
                      { backgroundColor: getScoreColor(evaluation.score) + '20' },
                    ]}
                  >
                    <Text style={[styles.evaluationScoreText, { color: getScoreColor(evaluation.score) }]}>
                      {(evaluation.score * 100).toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* What We Check */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What We Check</Text>
            <View style={styles.legendGrid}>
              <LegendItem icon={<Brain size={16} color={Colors.accent} />} label="Helpful" description="Is the response actually useful?" />
              <LegendItem icon={<CheckCircle size={16} color={Colors.success} />} label="Safe" description="No risky financial advice" />
              <LegendItem icon={<TrendingUp size={16} color={Colors.lavender} />} label="Actionable" description="Clear next steps you can take" />
              <LegendItem icon={<Activity size={16} color={Colors.coral} />} label="Accurate" description="Facts are correct" />
            </View>
          </View>
        </>
      )}

      {activeTab === 'feedback' && (
        <>
          {/* Feedback Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Feedback Summary</Text>
            <View style={styles.feedbackSummary}>
              <View style={styles.feedbackItem}>
                <View style={[styles.feedbackIcon, { backgroundColor: Colors.successMuted }]}>
                  <ThumbsUp size={24} color={Colors.success} />
                </View>
                <Text style={styles.feedbackCount}>{analytics?.feedbackStats.helpful || 0}</Text>
                <Text style={styles.feedbackLabel}>Helpful</Text>
              </View>
              <View style={styles.feedbackItem}>
                <View style={[styles.feedbackIcon, { backgroundColor: Colors.dangerMuted }]}>
                  <ThumbsDown size={24} color={Colors.danger} />
                </View>
                <Text style={styles.feedbackCount}>{analytics?.feedbackStats.notHelpful || 0}</Text>
                <Text style={styles.feedbackLabel}>Not Helpful</Text>
              </View>
              <View style={styles.feedbackItem}>
                <View style={[styles.feedbackIcon, { backgroundColor: Colors.neutralMuted }]}>
                  <Clock size={24} color={Colors.textMuted} />
                </View>
                <Text style={styles.feedbackCount}>{analytics?.feedbackStats.neutral || 0}</Text>
                <Text style={styles.feedbackLabel}>Neutral</Text>
              </View>
            </View>
          </View>

          {/* Feedback Rate */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Satisfaction Rate</Text>
            {(() => {
              const total = (analytics?.feedbackStats.helpful || 0) + (analytics?.feedbackStats.notHelpful || 0);
              const rate = total > 0 ? (analytics?.feedbackStats.helpful || 0) / total : 0;
              return (
                <View style={styles.satisfactionContainer}>
                  <View style={styles.satisfactionRing}>
                    <Text style={[styles.satisfactionValue, { color: getScoreColor(rate) }]}>
                      {total > 0 ? `${(rate * 100).toFixed(0)}%` : 'N/A'}
                    </Text>
                    <Text style={styles.satisfactionLabel}>Satisfaction</Text>
                  </View>
                  <Text style={styles.satisfactionNote}>
                    Based on {total} user ratings
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Interaction Types */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interaction Breakdown</Text>
            {Object.entries(analytics?.interactionsByType || {}).length === 0 ? (
              <Text style={styles.emptyText}>No interaction data yet</Text>
            ) : (
              Object.entries(analytics?.interactionsByType || {}).slice(0, 8).map(([type, count]) => (
                <View key={type} style={styles.interactionRow}>
                  <Text style={styles.interactionType}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Text style={styles.interactionCount}>{count}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Helper Components
function MetricCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 0.8) return <CheckCircle size={16} color={Colors.success} />;
  if (score >= 0.6) return <Activity size={16} color={Colors.warning} />;
  return <AlertTriangle size={16} color={Colors.danger} />;
}

function LegendItem({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <View style={styles.legendItem}>
      {icon}
      <View style={styles.legendText}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendDescription}>{description}</Text>
      </View>
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return Colors.success;
  if (score >= 0.6) return Colors.warning;
  return Colors.danger;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBarFill: {
    width: 24,
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureName: {
    width: 80,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featureBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  featureBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  featureCount: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  scoreRow: {
    marginBottom: 16,
  },
  scoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scoreName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBar: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  scoreValue: {
    width: 45,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  evaluationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  evaluationInfo: {
    flex: 1,
  },
  evaluationMetric: {
    fontSize: 14,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  evaluationTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  evaluationScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  evaluationScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  legendDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  feedbackSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feedbackItem: {
    alignItems: 'center',
  },
  feedbackIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackCount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  feedbackLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  satisfactionContainer: {
    alignItems: 'center',
  },
  satisfactionRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  satisfactionValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  satisfactionLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  satisfactionNote: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  interactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  interactionType: {
    fontSize: 14,
    color: Colors.text,
  },
  interactionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Agent styles
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  triggerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  learningItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  learningLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  learningValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  typeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeTag: {
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
    textTransform: 'capitalize',
  },
  interventionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  interventionInfo: {
    flex: 1,
  },
  interventionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  interventionMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  interventionTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  interventionStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  interventionStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ObservabilityDashboard;
