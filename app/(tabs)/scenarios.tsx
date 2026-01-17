import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { 
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export default function ScenariosScreen() {
  const { scenarios, financials } = useApp();
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const emergencyGap = financials.emergencyFundGoal - financials.savings;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Coach Card */}
      <ScreenCoachCard screenName="scenarios" />

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gap to Goal</Text>
            <Text style={styles.summaryValue}>
              ${emergencyGap.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current Savings</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              ${financials.savings.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {/* Scenarios */}
      {scenarios.map((scenario) => {
        const isExpanded = expandedScenario === scenario.id;
        const Icon = getScenarioIcon(scenario.id);
        const color = getScenarioColor(scenario.riskLevel);

        return (
          <Pressable 
            key={scenario.id}
            style={styles.scenarioCard}
            onPress={() => setExpandedScenario(isExpanded ? null : scenario.id)}
          >
            <View style={styles.scenarioHeader}>
              <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Icon size={22} color={color} />
              </View>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioDesc} numberOfLines={isExpanded ? undefined : 1}>
                  {scenario.description}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronUp size={20} color={Colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={Colors.textMuted} />
              )}
            </View>

            {/* Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>${scenario.monthlyContribution}</Text>
                <Text style={styles.metricLabel}>Monthly</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{scenario.monthsToGoal}mo</Text>
                <Text style={styles.metricLabel}>Timeline</Text>
              </View>
              <View style={styles.metric}>
                <View style={[styles.riskBadge, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.riskText, { color }]}>
                    {scenario.riskLevel}
                  </Text>
                </View>
                <Text style={styles.metricLabel}>Risk</Text>
              </View>
            </View>

            {/* Expanded Content */}
            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.reasoningBox}>
                  <Image source={{ uri: MASCOT_URL }} style={styles.miniMascot} />
                  <Text style={styles.reasoningText}>{scenario.reasoning}</Text>
                </View>

                {scenario.tradeoffs && scenario.tradeoffs.length > 0 && (
                  <View style={styles.tradeoffsSection}>
                    <Text style={styles.tradeoffsTitle}>Trade-offs</Text>
                    {scenario.tradeoffs.map((tradeoff, index) => (
                      <View key={index} style={styles.tradeoffItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tradeoffText}>{tradeoff}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.projectionCard}>
                  <Text style={styles.projectionLabel}>3-Year Projection</Text>
                  <Text style={styles.projectionValue}>
                    ${(scenario.projectedSavings || scenario.projectedOutcome || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These are educational projections, not financial advice. Actual results may vary.
        </Text>
      </View>
    </ScrollView>
  );
}

function getScenarioIcon(id: string) {
  const icons: Record<string, typeof Shield> = {
    conservative: Shield,
    balanced: Target,
    accelerated: Zap,
  };
  return icons[id] || Target;
}

function getScenarioColor(risk: string): string {
  const colors: Record<string, string> = {
    low: Colors.success,
    medium: Colors.warning,
    high: Colors.danger,
  };
  return colors[risk] || Colors.accent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  summaryCard: {
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  scenarioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  scenarioDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  miniMascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  reasoningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  tradeoffsSection: {
    marginBottom: 16,
  },
  tradeoffsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  tradeoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 6,
    marginRight: 10,
  },
  tradeoffText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  projectionCard: {
    backgroundColor: Colors.successMuted,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 12,
    color: Colors.success,
    marginBottom: 4,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },
  disclaimer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
