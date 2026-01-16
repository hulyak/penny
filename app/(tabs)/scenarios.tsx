import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
} from 'react-native';
import { 
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Shield,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { WhyPanel } from '@/components/WhyPanel';
import Colors from '@/constants/colors';

const SCENARIO_ICONS = {
  conservative: Shield,
  balanced: Target,
  accelerated: Zap,
};

const RISK_COLORS = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.danger,
};

export default function ScenariosScreen() {
  const { scenarios, financials, scenarioOutput } = useApp();
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const emergencyGap = financials.emergencyFundGoal - financials.savings;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Scenarios</Text>
        <Text style={styles.subtitle}>
          Explore different paths to reach your financial goals
        </Text>
      </View>

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
            <Text style={styles.summaryValue}>
              ${financials.savings.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {scenarios.map((scenario) => {
        const Icon = SCENARIO_ICONS[scenario.id as keyof typeof SCENARIO_ICONS] || Target;
        const isExpanded = expandedScenario === scenario.id;
        const riskColor = RISK_COLORS[scenario.riskLevel] || Colors.accent;

        return (
          <Card key={scenario.id} style={styles.scenarioCard}>
            <Pressable 
              style={styles.scenarioHeader}
              onPress={() => setExpandedScenario(isExpanded ? null : scenario.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: riskColor + '15' }]}>
                <Icon size={22} color={riskColor} />
              </View>

              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioDescription} numberOfLines={2}>
                  {scenario.description}
                </Text>
              </View>

              {isExpanded ? (
                <ChevronUp size={20} color={Colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={Colors.textMuted} />
              )}
            </Pressable>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Monthly</Text>
                <Text style={styles.metricValue}>
                  ${scenario.monthlyContribution}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Timeline</Text>
                <Text style={styles.metricValue}>
                  {scenario.monthsToGoal} mo
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Risk</Text>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + '15' }]}>
                  <Text style={[styles.riskText, { color: riskColor }]}>
                    {scenario.riskLevel}
                  </Text>
                </View>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.reasoningSection}>
                  <Text style={styles.sectionLabel}>Analysis</Text>
                  <Text style={styles.reasoningText}>{scenario.reasoning}</Text>
                </View>

                {scenario.tradeoffs && scenario.tradeoffs.length > 0 && (
                  <View style={styles.tradeoffsSection}>
                    <Text style={styles.sectionLabel}>Trade-offs</Text>
                    {scenario.tradeoffs.map((tradeoff, index) => (
                      <View key={index} style={styles.tradeoffItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tradeoffText}>{tradeoff}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.projectionCard}>
                  <Text style={styles.projectionLabel}>Projected Outcome (3 years)</Text>
                  <Text style={styles.projectionValue}>
                    ${scenario.projectedSavings?.toLocaleString() || scenario.projectedOutcome?.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        );
      })}

      {scenarioOutput && (
        <View style={styles.whyContainer}>
          <WhyPanel
            title="About These Scenarios"
            summary={scenarioOutput.summary}
            reasoning={scenarioOutput.reasoning}
            assumptions={scenarioOutput.assumptions}
            whatWouldChange={scenarioOutput.whatWouldChange}
            confidence={scenarioOutput.confidence}
          />
        </View>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These projections are educational simulations based on your inputs. 
          Actual results will vary. This is not financial advice.
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  summaryCard: {
    marginBottom: 20,
    padding: 16,
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
    marginBottom: 12,
    padding: 16,
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
  scenarioDescription: {
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
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  reasoningSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reasoningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  tradeoffsSection: {
    marginBottom: 16,
  },
  tradeoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
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
    backgroundColor: Colors.surfaceSecondary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },
  whyContainer: {
    marginTop: 8,
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
