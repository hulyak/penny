import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Card } from './Card';
import {
  initializeMarathonAgent,
  getAgentStatus,
  runReviewPhase,
  runAutonomousCheck,
} from '@/lib/marathonAgent';

interface MarathonAgentPanelProps {
  userId: string;
  financialContext: {
    monthlyIncome: number;
    monthlyExpenses: number;
    currentSavings: number;
    debts: number;
    savingsRate: number;
    monthsOfRunway: number;
    healthScore: number;
  };
  onGoalPress?: (goalId: string) => void;
}

export function MarathonAgentPanel({
  userId,
  financialContext,
  onGoalPress,
}: MarathonAgentPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<Awaited<ReturnType<typeof getAgentStatus>> | null>(null);
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadAgentStatus();
  }, [userId]);

  const loadAgentStatus = async () => {
    setIsLoading(true);
    try {
      let status = await getAgentStatus(userId);

      if (!status) {
        // Initialize new agent
        await initializeMarathonAgent(userId, financialContext);
        status = await getAgentStatus(userId);
      }

      setAgentStatus(status);

      // Check for autonomous actions
      if (status) {
        const check = await runAutonomousCheck(userId, financialContext);
        if (check.action !== 'none') {
          setNotification(check.message);
        }
      }
    } catch (error) {
      console.error('Error loading agent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunReview = async () => {
    setIsRunningReview(true);
    try {
      await runReviewPhase(userId, financialContext, []);
      await loadAgentStatus();
      setNotification('Review completed - goals updated');
    } catch (error) {
      console.error('Error running review:', error);
    } finally {
      setIsRunningReview(false);
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Initializing Marathon Agent...</Text>
        </View>
      </Card>
    );
  }

  if (!agentStatus) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color={Colors.warning} />
          <Text style={styles.errorText}>Unable to load agent</Text>
          <Pressable style={styles.retryButton} onPress={loadAgentStatus}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  const phaseColors: Record<string, string> = {
    analysis: Colors.accent,
    planning: Colors.lavender,
    execution: Colors.success,
    review: Colors.warning,
    adjustment: Colors.coral,
  };

  return (
    <View style={styles.wrapper}>
      {/* Status Card */}
      <Card style={styles.headerCard} variant="elevated">
        <View style={styles.headerRow}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: phaseColors[agentStatus.currentPhase] }]} />
            <Text style={styles.statusText}>
              {agentStatus.currentPhase.charAt(0).toUpperCase() + agentStatus.currentPhase.slice(1)} Phase
            </Text>
          </View>
          <View style={styles.geminiTag}>
            <Sparkles size={12} color={Colors.accent} />
            <Text style={styles.geminiText}>Gemini 3</Text>
          </View>
        </View>

        {notification && (
          <View style={styles.notificationBanner}>
            <Brain size={16} color={Colors.accent} />
            <Text style={styles.notificationText}>{notification}</Text>
          </View>
        )}

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{agentStatus.metrics.totalAnalysisRuns}</Text>
            <Text style={styles.metricLabel}>Analyses</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{agentStatus.metrics.corrections}</Text>
            <Text style={styles.metricLabel}>Corrections</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{agentStatus.metrics.goalsCompleted}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{agentStatus.daysSinceLastRun}d</Text>
            <Text style={styles.metricLabel}>Last Run</Text>
          </View>
        </View>
      </Card>

      {/* Goals Section */}
      <Text style={styles.sectionTitle}>Active Goals</Text>
      {agentStatus.goals.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Target size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No goals yet. The agent will create goals based on your financial analysis.</Text>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsScroll}>
          {agentStatus.goals.map((goal) => {
            const progress = goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0;
            const statusColor = goal.status === 'completed' ? Colors.success
              : goal.status === 'adjusted' ? Colors.warning
              : Colors.accent;

            return (
              <Pressable
                key={goal.id}
                style={styles.goalCard}
                onPress={() => onGoalPress?.(goal.id)}
              >
                <View style={styles.goalHeader}>
                  <View style={[styles.goalStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                </View>

                <View style={styles.goalProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
                </View>

                <View style={styles.goalDetails}>
                  <Text style={styles.goalAmount}>
                    ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                  </Text>
                  <View style={styles.goalDeadline}>
                    <Clock size={12} color={Colors.textMuted} />
                    <Text style={styles.deadlineText}>
                      {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

                <View style={[styles.priorityBadge, {
                  backgroundColor: goal.priority === 'high' ? Colors.coralMuted
                    : goal.priority === 'medium' ? Colors.warningMuted
                    : Colors.mintMuted
                }]}>
                  <Text style={[styles.priorityText, {
                    color: goal.priority === 'high' ? Colors.coral
                      : goal.priority === 'medium' ? Colors.warning
                      : Colors.success
                  }]}>
                    {goal.priority}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Recent Insights */}
      <Text style={styles.sectionTitle}>Agent Insights</Text>
      <Card style={styles.insightsCard}>
        {agentStatus.recentInsights.length === 0 ? (
          <Text style={styles.emptyInsights}>No insights yet. The agent is analyzing your finances.</Text>
        ) : (
          agentStatus.recentInsights.map((insight, index) => {
            const InsightIcon = insight.type === 'correction' ? AlertCircle
              : insight.type === 'milestone' ? CheckCircle2
              : insight.type === 'recommendation' ? TrendingUp
              : Brain;
            const iconColor = insight.type === 'correction' ? Colors.warning
              : insight.type === 'milestone' ? Colors.success
              : Colors.accent;

            return (
              <View key={index} style={styles.insightItem}>
                <View style={[styles.insightIcon, { backgroundColor: iconColor + '20' }]}>
                  <InsightIcon size={16} color={iconColor} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightText}>{insight.content}</Text>
                  <Text style={styles.insightTime}>
                    {new Date(insight.timestamp).toLocaleDateString()} • {(insight.confidence * 100).toFixed(0)}% confidence
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionButton, styles.primaryAction]}
          onPress={handleRunReview}
          disabled={isRunningReview}
        >
          {isRunningReview ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : (
            <RefreshCw size={18} color={Colors.textLight} />
          )}
          <Text style={styles.primaryActionText}>
            {isRunningReview ? 'Reviewing...' : 'Run Review'}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Text style={styles.secondaryActionText}>View History</Text>
          <ChevronRight size={18} color={Colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  container: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.textLight,
    fontWeight: '600',
  },

  headerCard: {
    padding: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  geminiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  geminiText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 4,
  },

  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  notificationText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: Colors.accent,
  },

  metricsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  goalsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  goalCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  goalName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    width: 36,
    textAlign: 'right',
  },
  goalDetails: {
    marginBottom: 12,
  },
  goalAmount: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  goalDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deadlineText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  insightsCard: {
    padding: 16,
    marginBottom: 20,
  },
  emptyInsights: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  insightTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: Colors.accent,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
});
