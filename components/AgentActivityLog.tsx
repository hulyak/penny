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
  Bot,
  Brain,
  Bell,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Zap,
  Clock,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getInterventionHistory,
  getAgentAnalytics,
  triggerAgentCheck,
  sendDemoNotification,
  Intervention,
  AgentState,
  AgentCheckResult,
} from '@/lib/agentLoop';
import { Alert } from 'react-native';
import { GeminiBadge } from './GeminiBadge';

interface AgentActivityLogProps {
  compact?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
}

export function AgentActivityLog({
  compact = false,
  maxItems = 5,
  onViewAll
}: AgentActivityLogProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSendingDemo, setIsSendingDemo] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    setIsLoading(true);
    try {
      const analytics = await getAgentAnalytics();
      setInterventions(analytics.recentInterventions);
      setAgentState(analytics.state);
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAgentNow = async () => {
    setIsRunning(true);
    try {
      const result = await triggerAgentCheck();
      await loadAgentData();

      // Show feedback to user
      Alert.alert(
        result.interventionSent ? '✓ Alert Sent' : '✓ Check Complete',
        result.checks.join('\n'),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to run check:', error);
      Alert.alert('Error', 'Failed to run portfolio check');
    } finally {
      setIsRunning(false);
    }
  };

  const sendDemo = async () => {
    setIsSendingDemo(true);
    try {
      await sendDemoNotification();
      await loadAgentData();
      Alert.alert('Demo Alert Sent!', 'Check your notifications 🔔');
    } catch (error) {
      console.error('Failed to send demo:', error);
      Alert.alert('Error', 'Failed to send demo notification');
    } finally {
      setIsSendingDemo(false);
    }
  };

  const getInterventionIcon = (type: Intervention['type']) => {
    switch (type) {
      case 'drift_alert':
        return <TrendingDown size={16} color={Colors.warning} />;
      case 'contribution_reminder':
        return <Calendar size={16} color={Colors.primary} />;
      case 'milestone':
        return <Target size={16} color={Colors.success} />;
      case 'rebalance_suggestion':
        return <RefreshCw size={16} color={Colors.accent} />;
      case 'goal_check':
        return <TrendingUp size={16} color={Colors.lavender} />;
      default:
        return <Bell size={16} color={Colors.textMuted} />;
    }
  };

  const getInterventionColor = (type: Intervention['type']) => {
    switch (type) {
      case 'drift_alert':
        return Colors.warningMuted;
      case 'contribution_reminder':
        return Colors.primaryMuted;
      case 'milestone':
        return Colors.successMuted;
      case 'rebalance_suggestion':
        return Colors.accentMuted;
      case 'goal_check':
        return Colors.lavenderMuted;
      default:
        return Colors.surfaceSecondary;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const displayedInterventions = compact
    ? interventions.slice(-maxItems).reverse()
    : interventions.slice().reverse();

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.agentIcon}>
            <Bot size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Portfolio Monitor</Text>
            <View style={styles.headerMeta}>
              <GeminiBadge variant="inline" />
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={[styles.demoButton, isSendingDemo && styles.runButtonDisabled]}
            onPress={sendDemo}
            disabled={isSendingDemo}
          >
            {isSendingDemo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Bell size={14} color="#fff" />
                <Text style={styles.demoButtonText}>Demo</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Agent Stats */}
      {agentState && !compact && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{agentState.weeklyInterventionCount}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(agentState.userResponseRate * 100)}%</Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{agentState.effectiveInterventionTypes.length}</Text>
            <Text style={styles.statLabel}>Active Types</Text>
          </View>
        </View>
      )}

      {/* Activity Log */}
      <View style={styles.logSection}>
        <View style={styles.logHeader}>
          <Clock size={14} color={Colors.textMuted} />
          <Text style={styles.logTitle}>Recent Activity</Text>
        </View>

        {displayedInterventions.length === 0 ? (
          <View style={styles.emptyState}>
            <Brain size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              No alerts yet. We're watching your portfolio for important changes.
            </Text>
            <Text style={styles.emptyHint}>
              Tip: Set target allocations in Portfolio Analysis to enable drift alerts.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.logList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {displayedInterventions.map((intervention) => (
              <View
                key={intervention.id}
                style={[
                  styles.logItem,
                  { backgroundColor: getInterventionColor(intervention.type) }
                ]}
              >
                <View style={styles.logItemIcon}>
                  {getInterventionIcon(intervention.type)}
                </View>
                <View style={styles.logItemContent}>
                  <Text style={styles.logItemTitle}>{intervention.title}</Text>
                  <Text style={styles.logItemMessage} numberOfLines={2}>
                    {intervention.message}
                  </Text>
                  <View style={styles.logItemMeta}>
                    <Text style={styles.logItemTime}>
                      {formatTime(intervention.timestamp)}
                    </Text>
                    {intervention.responded && (
                      <View style={styles.respondedBadge}>
                        <CheckCircle size={12} color={Colors.success} />
                        <Text style={styles.respondedText}>Responded</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* View All Button */}
      {compact && interventions.length > maxItems && onViewAll && (
        <Pressable style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All Activity</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      )}

      {/* Learning Indicator */}
      {!compact && (
        <View style={styles.learningCard}>
          <Brain size={16} color={Colors.lavender} />
          <View style={styles.learningContent}>
            <Text style={styles.learningTitle}>Personalized Alerts</Text>
            <Text style={styles.learningText}>
              Learns which alerts matter most to you based on your responses.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Full-screen agent activity view
export function AgentActivityScreen() {
  return (
    <View style={styles.screenContainer}>
      <AgentActivityLog compact={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  containerCompact: {
    padding: 14,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  demoButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },

  logSection: {
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logList: {
    maxHeight: 300,
  },
  logItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  logItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logItemContent: {
    flex: 1,
  },
  logItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  logItemMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  logItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  logItemTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  respondedText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  learningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lavenderMuted,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  learningContent: {
    flex: 1,
  },
  learningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavender,
  },
  learningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
